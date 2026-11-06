import { fcmDispatchGuard } from '../fcm-dispatch.guard';
import { FirebaseNotificationProvider } from '../providers/firebase-notification.provider';
import { PostgresDeliveryStore } from './delivery.store';
import { BusinessDeliveryEligibility } from './business-notification-events';
import { NotificationCategory } from '../notification-preferences.policy';
import { DataSource } from 'typeorm';
import {
  ForbiddenException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { NotificationDelivery } from '../../database/entities/notification-delivery.entity';
import type { DeliveryStore } from './delivery.store';
import type { DeliveryEligibility } from './delivery.service';
import type {
  INotificationProvider,
  SendResult,
} from '../interfaces/INotificationProvider.interface';
import { MockNotificationProvider } from '../providers/mock-notification.provider';
import { FcmDispatchBlockedError } from '../fcm-dispatch.guard';
import {
  DELIVERY_TIMEOUT_MS,
  DeliveryError,
  DeliveryState,
  retryDelay,
  type TokenDeliveryResult,
} from './delivery.policy';

export class NotificationDeliveryWorker {
  private readonly logger = new Logger(NotificationDeliveryWorker.name);
  private constructor(
    private readonly store: DeliveryStore,
    private readonly eligibility: DeliveryEligibility,
    private readonly provider: INotificationProvider,
    private readonly random: () => number,
    private readonly timeoutMs: number,
  ) {}

  static forTests(
    this: void,
    store: DeliveryStore,
    eligibility: DeliveryEligibility,
    provider: MockNotificationProvider,
    options: { random?: () => number; timeoutMs?: number } = {},
  ): NotificationDeliveryWorker {
    if (
      process.env.NODE_ENV !== 'test' ||
      !(provider instanceof MockNotificationProvider)
    )
      throw new ForbiddenException('Delivery dispatch disabled');
    return new NotificationDeliveryWorker(
      store,
      eligibility,
      provider,
      options.random ?? Math.random,
      Math.max(
        1,
        Math.min(DELIVERY_TIMEOUT_MS, options.timeoutMs ?? DELIVERY_TIMEOUT_MS),
      ),
    );
  }

  static forNotices(
    source: DataSource,
    provider: FirebaseNotificationProvider,
  ): NotificationDeliveryWorker {
    fcmDispatchGuard.assertAllowed();
    if (process.env.NOTICE_DELIVERY_ENABLED !== 'true')
      throw new ForbiddenException('Notice delivery disabled');
    return new NotificationDeliveryWorker(
      new PostgresDeliveryStore(source, undefined, 'PUSH', [
        NotificationCategory.NOTICE,
        NotificationCategory.EMERGENCY,
      ]),
      new BusinessDeliveryEligibility(source),
      provider,
      Math.random,
      DELIVERY_TIMEOUT_MS,
    );
  }

  static forPolls(source: DataSource, provider: FirebaseNotificationProvider): NotificationDeliveryWorker {
    fcmDispatchGuard.assertAllowed();
    if (process.env.POLL_PUSH_DELIVERY_ENABLED !== 'true') throw new ForbiddenException('Poll push delivery disabled');
    return new NotificationDeliveryWorker(new PostgresDeliveryStore(source, undefined, 'PUSH', [NotificationCategory.POLL]), new BusinessDeliveryEligibility(source), provider, Math.random, DELIVERY_TIMEOUT_MS);
  }

  private async send(
    token: string,
    row: NotificationDelivery,
    platform?: string,
  ): Promise<TokenDeliveryResult> {
    this.provider.assertDispatchAllowed?.();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result: SendResult | null = await Promise.race([
        this.provider.sendToTokens([token], {
          title:
            row.category === NotificationCategory.POLL ? 'New community poll' : row.category === NotificationCategory.EMERGENCY
              ? 'SocietyOS emergency notice'
              : 'SocietyOS',
          body:
            row.category === NotificationCategory.POLL ? 'Open SocietyOS → Notices → Community Polls to vote.' : row.category === NotificationCategory.EMERGENCY
              ? 'Open SocietyOS to read an emergency notice.'
              : 'You have a new update.',
          dataOnly: platform !== 'ANDROID' && platform !== 'IOS',
          data: {
            deliveryId: row.id,
            category: row.category,
            referenceId: row.reference_id,
          },
        }),
        new Promise<null>((resolve) => {
          timer = setTimeout(() => resolve(null), this.timeoutMs);
        }),
      ]);
      if (!result)
        return { status: 'uncertain', error: DeliveryError.UNKNOWN_OUTCOME };
      if (result.tokenResults?.length === 1) return result.tokenResults[0];
      if (result.invalidTokens.includes(token))
        return { status: 'permanent', error: DeliveryError.INVALID_TOKEN };
      if (result.successCount === 1 && result.failureCount === 0)
        return { status: 'accepted', error: null };
      return { status: 'uncertain', error: DeliveryError.UNKNOWN_OUTCOME };
    } catch (error: unknown) {
      if (error instanceof FcmDispatchBlockedError) throw error;
      return { status: 'uncertain', error: DeliveryError.UNKNOWN_OUTCOME };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async runOnce(): Promise<boolean> {
    try {
      this.provider.assertDispatchAllowed?.();
    } catch (error: unknown) {
      if (error instanceof FcmDispatchBlockedError) return false;
      throw error;
    }
    let row: NotificationDelivery | null;
    try {
      row = await this.store.claim();
    } catch {
      throw new ServiceUnavailableException(
        'Delivery worker storage unavailable',
      );
    }
    if (!row) return false;
    let uncertainCheckpoint = false;
    let retryError: DeliveryError | null = null;
    try {
      if (
        !(await this.eligibility.resident(row)) ||
        (this.eligibility.available && !(await this.eligibility.available(row)))
      ) {
        await this.store.finish(
          row,
          DeliveryState.CANCELLED,
          DeliveryError.RECIPIENT_INELIGIBLE,
        );
        return true;
      }
      if (!(await this.enabled(row))) return true;
      if (row.target_token_ids === null) {
        row.target_token_ids = (await this.eligibility.tokens(row)).map(
          (token) => token.id,
        );
        if (!row.target_token_ids.length) {
          row.target_token_ids = null;
          await this.retry(row, DeliveryError.NO_ACTIVE_TOKEN);
          return true;
        }
        if (!(await this.store.checkpoint(row))) return true;
      }
      let permanentError = DeliveryError.TARGET_FAILED;
      for (const id of row.target_token_ids) {
        if (
          row.accepted_token_ids.includes(id) ||
          row.permanent_token_ids.includes(id)
        )
          continue;
        // Revalidate membership, preference, token ownership and lease immediately before each attempt.
        if (
          !(await this.eligibility.resident(row)) ||
          (this.eligibility.available &&
            !(await this.eligibility.available(row)))
        ) {
          await this.store.finish(
            row,
            DeliveryState.CANCELLED,
            DeliveryError.RECIPIENT_INELIGIBLE,
          );
          return true;
        }
        if (!(await this.enabled(row))) return true;
        const current = (await this.eligibility.tokens(row, [id]))[0];
        if (
          !current ||
          current.id !== id ||
          current.user_id !== row.recipient_user_id ||
          current.organization_id !== row.organization_id ||
          !current.is_active
        ) {
          row.permanent_token_ids.push(id);
          permanentError = DeliveryError.TOKEN_REVOKED;
          if (!(await this.store.checkpoint(row))) return true;
          continue;
        }
        if (!(await this.store.checkpoint(row))) return true;
        uncertainCheckpoint = true;
        const result = await this.send(current.token, row, current.platform);
        if (result.status === 'accepted') row.accepted_token_ids.push(id);
        else if (result.status === 'permanent') {
          row.permanent_token_ids.push(id);
          permanentError = result.error ?? DeliveryError.INVALID_PAYLOAD;
          if (result.error === DeliveryError.INVALID_TOKEN)
            await this.eligibility.invalidate(current.token);
        } else retryError = result.error ?? DeliveryError.UNKNOWN_OUTCOME;
        if (!(await this.store.checkpoint(row))) return true;
        uncertainCheckpoint = false;
        if (result.status === 'uncertain') {
          await this.retry(row, DeliveryError.UNKNOWN_OUTCOME);
          return true;
        }
      }
      if (retryError) await this.retry(row, retryError);
      else
        await this.store.finish(
          row,
          row.permanent_token_ids.length
            ? DeliveryState.PERMANENT_FAILURE
            : DeliveryState.ACCEPTED_BY_PROVIDER,
          row.permanent_token_ids.length ? permanentError : null,
        );
      return true;
    } catch (error: unknown) {
      try {
        if (error instanceof FcmDispatchBlockedError) {
          if (retryError) await this.retry(row, retryError);
          else if (!(await this.store.pause(row)))
            this.logger.warn({
              event: 'notification_delivery_pause_not_committed',
            });
          this.logger.warn({ event: 'notification_delivery_dispatch_blocked' });
          return true;
        }
        await this.retry(
          row,
          uncertainCheckpoint
            ? DeliveryError.UNKNOWN_OUTCOME
            : DeliveryError.STORAGE_UNAVAILABLE,
        );
      } catch {
        this.logger.warn({
          event: 'notification_delivery_lease_recovery_required',
          classification: DeliveryError.STORAGE_UNAVAILABLE,
        });
      }
      return true;
    }
  }
  private async enabled(row: NotificationDelivery): Promise<boolean> {
    try {
      if (await this.eligibility.enabled(row)) return true;
      await this.store.finish(
        row,
        DeliveryState.CANCELLED,
        DeliveryError.OPTED_OUT,
      );
    } catch {
      await this.retry(row, DeliveryError.PREFERENCE_UNAVAILABLE);
    }
    return false;
  }
  private async retry(
    row: NotificationDelivery,
    error: DeliveryError,
  ): Promise<void> {
    this.logger.warn({
      event: 'notification_delivery_deferred',
      classification: error,
      attempt: row.attempt_count,
    });
    await this.store.finish(
      row,
      DeliveryState.RETRY_WAIT,
      error,
      Math.max(
        error === DeliveryError.RATE_LIMITED ? 60000 : 0,
        retryDelay(
          row.attempt_count,
          this.random,
          error === DeliveryError.UNKNOWN_OUTCOME,
        ),
      ),
    );
  }
}
