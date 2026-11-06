import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Notice } from '../database/entities/notice.entity';
import { UserRole } from '../database/entities/user-role.entity';
import {
  BusinessDeliveryEligibility,
  notificationEventKey,
} from '../notifications/delivery/business-notification-events';
import { NotificationDeliveryService } from '../notifications/delivery/delivery.service';
import { PostgresDeliveryStore } from '../notifications/delivery/delivery.store';
import { NotificationCategory } from '../notifications/notification-preferences.policy';
import { NoticePriority } from './notice-policy';

@Injectable()
export class NoticeDeliveryAdmission {
  constructor(private readonly source: DataSource) {}
  async enqueue(
    manager: EntityManager,
    notice: Notice,
    recipients: UserRole[],
  ): Promise<void> {
    const eligibility = new BusinessDeliveryEligibility(this.source);
    const category =
      notice.priority === NoticePriority.EMERGENCY
        ? NotificationCategory.EMERGENCY
        : NotificationCategory.NOTICE;
    for (const userId of new Set(recipients.map((member) => member.userId))) {
      const input = {
        organization_id: notice.organization_id,
        recipient_user_id: userId,
        reference_id: notice.id,
        category,
      };
      if (
        !(await eligibility.resident({
          ...input,
          idempotency_key: notificationEventKey(
            `notice:${notice.id}:published`,
          ),
        }))
      )
        continue;
      const channels =
        notice.priority === NoticePriority.NORMAL
          ? (['PUSH'] as const)
          : (['PUSH', 'WHATSAPP'] as const);
      for (const channel of channels) {
        await new NotificationDeliveryService(
          new PostgresDeliveryStore(this.source, manager, channel),
          eligibility,
        ).enqueue({
          ...input,
          idempotency_key: notificationEventKey(
            `notice:${notice.id}:${channel}:published`,
          ),
        });
      }
    }
  }
}
