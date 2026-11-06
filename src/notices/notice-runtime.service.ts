import { NOTIFICATION_PROVIDER } from '../notifications/interfaces/INotificationProvider.interface';
import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Redis } from 'ioredis';
import { Notice } from '../database/entities/notice.entity';
import { Organization } from '../database/entities/organization.entity';
import { User } from '../database/entities/user.entity';
import { NotificationCategory } from '../notifications/notification-preferences.policy';
import { FirebaseNotificationProvider } from '../notifications/providers/firebase-notification.provider';
import { fcmDispatchGuard } from '../notifications/fcm-dispatch.guard';
import { BusinessDeliveryEligibility } from '../notifications/delivery/business-notification-events';
import { PostgresDeliveryStore } from '../notifications/delivery/delivery.store';
import {
  DeliveryError,
  DeliveryState,
  retryDelay,
} from '../notifications/delivery/delivery.policy';
import { NotificationDeliveryWorker } from '../notifications/delivery/delivery.worker';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { NoticeService } from './notice.service';
import { Poll } from '../database/entities/poll.entity';
import { pollWhatsAppMessage } from '../polls/poll-delivery-admission';

@Injectable()
export class NoticeRuntimeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NoticeRuntimeService.name);
  private timer?: ReturnType<typeof setInterval>;
  private busy = false;
  private stopped = false;
  constructor(
    private readonly source: DataSource,
    private readonly notices: NoticeService,
    @Inject(NOTIFICATION_PROVIDER)
    private readonly firebase: FirebaseNotificationProvider,
    private readonly whatsapp: WhatsAppService,
    @Inject('REDIS_CLIENT') private readonly redis: Pick<Redis, 'get'>,
  ) {}
  onModuleInit(): void {
    if (
      process.env.NOTICE_SCHEDULER_ENABLED !== 'true' &&
      process.env.NOTICE_DELIVERY_ENABLED !== 'true' && process.env.POLL_PUSH_DELIVERY_ENABLED !== 'true'
    )
      return;
    this.logger.log({
      event: 'notice_runtime_started',
      deliveryEnabled: process.env.NOTICE_DELIVERY_ENABLED === 'true',
      schedulerEnabled: process.env.NOTICE_SCHEDULER_ENABLED === 'true',
    });
    this.timer = setInterval(() => {
      void this.tick();
    }, 15000);
    this.timer.unref();
  }
  onModuleDestroy(): void {
    this.stopped = true;
    clearInterval(this.timer);
  }

  async tick(): Promise<void> {
    if (this.busy || this.stopped) return;
    this.busy = true;
    try {
      if (process.env.NOTICE_SCHEDULER_ENABLED === 'true')
        await this.publishDue();
      if (process.env.POLL_PUSH_DELIVERY_ENABLED === 'true' && fcmDispatchGuard.isEnabled()) {
        const worker = NotificationDeliveryWorker.forPolls(this.source, this.firebase);
        for (let i = 0; i < 10 && !this.stopped && process.env.POLL_PUSH_DELIVERY_ENABLED === 'true' && fcmDispatchGuard.isEnabled(); i++) if (!(await worker.runOnce())) break;
      }
      if (process.env.NOTICE_DELIVERY_ENABLED === 'true') {
        if (fcmDispatchGuard.isEnabled() && process.env.NOTICE_PUSH_DELIVERY_ENABLED !== 'false') {
          const worker = NotificationDeliveryWorker.forNotices(
            this.source,
            this.firebase,
          );
          for (
            let i = 0;
            i < 10 &&
            !this.stopped &&
            process.env.NOTICE_DELIVERY_ENABLED === 'true' &&
            fcmDispatchGuard.isEnabled();
            i++
          )
            if (!(await worker.runOnce())) break;
        }
        for (
          let i = 0;
          i < 10 &&
          !this.stopped &&
          process.env.NOTICE_DELIVERY_ENABLED === 'true';
          i++
        )
          if (!(await this.whatsappOnce())) break;
      }
    } catch {
      this.logger.warn({ event: 'notice_runtime_deferred' });
    } finally {
      this.busy = false;
    }
  }

  async publishDue(): Promise<void> {
    if (process.env.NOTICE_SCHEDULER_ENABLED !== 'true') return;
    const due = await this.source
      .getRepository(Notice)
      .createQueryBuilder('notice')
      .where(
        'notice.status = :status AND notice.scheduled_at <= CURRENT_TIMESTAMP',
        { status: 'SCHEDULED' },
      )
      .orderBy('notice.scheduled_at', 'ASC')
      .take(20)
      .getMany();
    for (const notice of due) {
      if (this.stopped || process.env.NOTICE_SCHEDULER_ENABLED !== 'true')
        break;
      try {
        if (
          !(await this.source
            .getRepository(Organization)
            .findOneBy({ id: notice.organization_id, isActive: true }))
        )
          continue;
        if (notice.expires_at <= new Date()) {
          await this.source
            .getRepository(Notice)
            .createQueryBuilder()
            .update()
            .set({
              status: 'ARCHIVED',
              scheduled_at: null,
              updated_at: new Date(),
            })
            .where(
              'id = :id AND organization_id = :org AND status = :status AND expires_at <= CURRENT_TIMESTAMP',
              {
                id: notice.id,
                org: notice.organization_id,
                status: 'SCHEDULED',
              },
            )
            .execute();
          continue;
        }
        // Publication locks/rechecks status, so competing instances cannot duplicate inbox/outbox writes.
        await this.notices.publish(
          notice.id,
          {
            organizationId: notice.organization_id,
            organization_id: notice.organization_id,
          },
          true,
        );
      } catch {
        this.logger.warn({ event: 'scheduled_notice_publication_deferred' });
      }
    }
  }

  async whatsappOnce(): Promise<boolean> {
    if (process.env.NOTICE_DELIVERY_ENABLED !== 'true') return false;
    const store = new PostgresDeliveryStore(
      this.source,
      undefined,
      'WHATSAPP',
      [NotificationCategory.NOTICE, NotificationCategory.EMERGENCY, NotificationCategory.POLL],
    );
    const row = await store.claim();
    if (!row) return false;
    try {
      const eligibility = new BusinessDeliveryEligibility(this.source);
      if (
        !(await eligibility.resident(row)) ||
        !(await eligibility.available(row))
      ) {
        await store.finish(
          row,
          DeliveryState.CANCELLED,
          DeliveryError.RECIPIENT_INELIGIBLE,
        );
        return true;
      }
      if (!(await eligibility.enabled(row))) {
        await store.finish(
          row,
          DeliveryState.CANCELLED,
          DeliveryError.OPTED_OUT,
        );
        return true;
      }
      // Strict settings read: WhatsAppService's legacy read fallback must not enable a failed notice settings lookup.
      const raw = await this.redis.get(`wa:settings:${row.organization_id}`);
      const settings: unknown = raw
        ? JSON.parse(raw)
        : { isEnabled: true, notifyNotice: true };
      if (
        !settings ||
        typeof settings !== 'object' ||
        !('isEnabled' in settings) ||
        settings.isEnabled !== true ||
        (row.category !== NotificationCategory.EMERGENCY &&
          'notifyNotice' in settings &&
          settings.notifyNotice !== true)
      ) {
        await store.pause(row);
        return false;
      }
      const user = await this.source
        .getRepository(User)
        .findOneBy({ id: row.recipient_user_id });
      const reference = row.category === NotificationCategory.POLL
        ? await this.source.getRepository(Poll).findOneBy({ id: row.reference_id, organization_id: row.organization_id })
        : await this.source.getRepository(Notice).findOneBy({ id: row.reference_id, organization_id: row.organization_id });
      if (!reference || !user?.mobileNumber) {
        await store.finish(
          row,
          DeliveryState.PERMANENT_FAILURE,
          DeliveryError.INVALID_PAYLOAD,
        );
        return true;
      }
      let message: string;
      if (row.category === NotificationCategory.POLL) {
        const organization = await this.source.getRepository(Organization).findOneBy({ id: row.organization_id, isActive: true });
        message = pollWhatsAppMessage(reference as Poll, organization?.name || 'Your society');
      } else {
        const notice = reference as Notice;
        const template = await this.whatsapp.renderTemplate(row.organization_id, 'notice', { notice_title: notice.title, notice_content: notice.content });
        message = `${row.category === NotificationCategory.EMERGENCY ? '🚨 *EMERGENCY NOTICE*\n\n' : ''}${template}`;
      }
      if (this.stopped || process.env.NOTICE_DELIVERY_ENABLED !== 'true') {
        await store.pause(row);
        return false;
      }
      const accepted = await this.whatsapp.sendNotification(
        user.mobileNumber,
        message,
        { organizationId: row.organization_id, category: row.category },
      );
      await store.finish(
        row,
        accepted
          ? DeliveryState.ACCEPTED_BY_PROVIDER
          : DeliveryState.RETRY_WAIT,
        accepted ? null : DeliveryError.PROVIDER_UNAVAILABLE,
        accepted ? undefined : retryDelay(row.attempt_count),
      );
    } catch {
      await store.finish(
        row,
        DeliveryState.RETRY_WAIT,
        DeliveryError.UNKNOWN_OUTCOME,
        retryDelay(row.attempt_count, Math.random, true),
      );
    }
    return true;
  }
}
