import { ConflictException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager } from 'typeorm';
import { NotificationCategory } from '../notification-preferences.policy';
import { NotificationDelivery } from '../../database/entities/notification-delivery.entity';
import {
  DELIVERY_LEASE_MS,
  DELIVERY_MAX_ATTEMPTS,
  DELIVERY_UNCERTAIN_DELAY_MS,
  DeliveryError,
  DeliveryState,
} from './delivery.policy';

export type DeliverySubmission = Pick<
  NotificationDelivery,
  | 'organization_id'
  | 'recipient_user_id'
  | 'reference_id'
  | 'category'
  | 'idempotency_key'
>;
export interface DeliveryStore {
  enqueue(
    input: DeliverySubmission,
    cancelled: boolean,
  ): Promise<NotificationDelivery>;
  claim(): Promise<NotificationDelivery | null>;
  checkpoint(row: NotificationDelivery): Promise<boolean>;
  pause(row: NotificationDelivery): Promise<boolean>;
  finish(
    row: NotificationDelivery,
    state:
      | DeliveryState.RETRY_WAIT
      | DeliveryState.ACCEPTED_BY_PROVIDER
      | DeliveryState.PERMANENT_FAILURE
      | DeliveryState.CANCELLED,
    error: DeliveryError | null,
    delay?: number,
  ): Promise<boolean>;
}

export class PostgresDeliveryStore implements DeliveryStore {
  constructor(
    private readonly source: DataSource,
    private readonly admissionManager?: EntityManager,
    private readonly channel: 'PUSH' | 'WHATSAPP' = 'PUSH',
    private readonly categories?: NotificationCategory[],
  ) {}
  async enqueue(
    input: DeliverySubmission,
    cancelled: boolean,
  ): Promise<NotificationDelivery> {
    if (
      this.admissionManager &&
      (this.admissionManager.connection !== this.source ||
        !this.admissionManager.queryRunner?.isTransactionActive)
    )
      throw new Error('Active admission transaction required');
    const repo = (this.admissionManager ?? this.source.manager).getRepository(
      NotificationDelivery,
    );
    await repo
      .createQueryBuilder()
      .insert()
      .values({
        ...input,
        channel: this.channel,
        id: randomUUID(),
        state: cancelled ? DeliveryState.CANCELLED : DeliveryState.PENDING,
        error_code: cancelled ? DeliveryError.OPTED_OUT : null,
        completed_at: cancelled ? () => 'CURRENT_TIMESTAMP' : null,
      })
      .orIgnore()
      .execute();
    const existing = await repo.findOneByOrFail({
      organization_id: input.organization_id,
      recipient_user_id: input.recipient_user_id,
      idempotency_key: input.idempotency_key,
    });
    if (
      existing.category !== input.category ||
      existing.reference_id !== input.reference_id
    )
      throw new ConflictException('Delivery idempotency key already used');
    return existing;
  }
  async claim(): Promise<NotificationDelivery | null> {
    const repo = this.source.getRepository(NotificationDelivery);
    await repo
      .createQueryBuilder()
      .update()
      .set({
        state: () =>
          `CASE WHEN "attempt_count" >= ${DELIVERY_MAX_ATTEMPTS} THEN 'PERMANENT_FAILURE' ELSE 'RETRY_WAIT' END`,
        error_code: DeliveryError.LEASE_EXPIRED,
        lease_id: null,
        lease_until: null,
        next_attempt_at: () =>
          `CURRENT_TIMESTAMP + interval '${DELIVERY_UNCERTAIN_DELAY_MS} milliseconds'`,
        completed_at: () =>
          `CASE WHEN "attempt_count" >= ${DELIVERY_MAX_ATTEMPTS} THEN CURRENT_TIMESTAMP ELSE NULL END`,
        updated_at: () => 'CURRENT_TIMESTAMP',
      })
      .where(
        '"state" = :state AND "lease_until" <= CURRENT_TIMESTAMP AND "channel" = :channel' +
          (this.categories ? ' AND "category" IN (:...categories)' : ''),
        {
          state: DeliveryState.PROCESSING,
          channel: this.channel,
          ...(this.categories ? { categories: this.categories } : {}),
        },
      )
      .execute();
    return this.source.transaction(async (manager) => {
      const repository = manager.getRepository(NotificationDelivery);
      const row = await repository
        .createQueryBuilder('d')
        .where(
          'd.state IN (:...states) AND d.next_attempt_at <= CURRENT_TIMESTAMP AND d.attempt_count < :max AND d.channel = :channel' +
            (this.categories ? ' AND d.category IN (:...categories)' : ''),
          {
            states: [DeliveryState.PENDING, DeliveryState.RETRY_WAIT],
            max: DELIVERY_MAX_ATTEMPTS,
            channel: this.channel,
            ...(this.categories ? { categories: this.categories } : {}),
          },
        )
        .orderBy('d.next_attempt_at', 'ASC')
        .addOrderBy('d.created_at', 'ASC')
        .addOrderBy('d.id', 'ASC')
        .take(1)
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .getOne();
      if (!row) return null;
      await repository.update(
        { id: row.id },
        {
          state: DeliveryState.PROCESSING,
          attempt_count: () => '"attempt_count" + 1',
          lease_id: randomUUID(),
          lease_until: () =>
            `CURRENT_TIMESTAMP + interval '${DELIVERY_LEASE_MS} milliseconds'`,
          updated_at: () => 'CURRENT_TIMESTAMP',
        },
      );
      return repository.findOneByOrFail({ id: row.id });
    });
  }
  async checkpoint(row: NotificationDelivery): Promise<boolean> {
    const result = await this.source
      .getRepository(NotificationDelivery)
      .createQueryBuilder()
      .update()
      .set({
        target_token_ids: row.target_token_ids,
        accepted_token_ids: row.accepted_token_ids,
        permanent_token_ids: row.permanent_token_ids,
        lease_until: () =>
          `CURRENT_TIMESTAMP + interval '${DELIVERY_LEASE_MS} milliseconds'`,
        updated_at: () => 'CURRENT_TIMESTAMP',
      })
      .where(
        '"id" = :id AND "organization_id" = :org AND "recipient_user_id" = :user AND "state" = :state AND "lease_id" = :lease AND "lease_until" > CURRENT_TIMESTAMP',
        {
          id: row.id,
          org: row.organization_id,
          user: row.recipient_user_id,
          state: DeliveryState.PROCESSING,
          lease: row.lease_id,
        },
      )
      .execute();
    return result.affected === 1;
  }
  async pause(row: NotificationDelivery): Promise<boolean> {
    const result = await this.source
      .getRepository(NotificationDelivery)
      .createQueryBuilder()
      .update()
      .set({
        state: DeliveryState.RETRY_WAIT,
        error_code: DeliveryError.DISPATCH_DISABLED,
        attempt_count: () => 'GREATEST(0, "attempt_count" - 1)',
        lease_id: null,
        lease_until: null,
        next_attempt_at: () => "CURRENT_TIMESTAMP + interval '60 seconds'",
        completed_at: null,
        updated_at: () => 'CURRENT_TIMESTAMP',
      })
      .where(
        '"id" = :id AND "organization_id" = :org AND "recipient_user_id" = :user AND "state" = :state AND "lease_id" = :lease AND "lease_until" > CURRENT_TIMESTAMP',
        {
          id: row.id,
          org: row.organization_id,
          user: row.recipient_user_id,
          state: DeliveryState.PROCESSING,
          lease: row.lease_id,
        },
      )
      .execute();
    return result.affected === 1;
  }

  async finish(
    row: NotificationDelivery,
    state:
      | DeliveryState.RETRY_WAIT
      | DeliveryState.ACCEPTED_BY_PROVIDER
      | DeliveryState.PERMANENT_FAILURE
      | DeliveryState.CANCELLED,
    error: DeliveryError | null,
    delay = 0,
  ): Promise<boolean> {
    if (
      state === DeliveryState.RETRY_WAIT &&
      row.attempt_count >= DELIVERY_MAX_ATTEMPTS
    )
      state = DeliveryState.PERMANENT_FAILURE;
    const result = await this.source
      .getRepository(NotificationDelivery)
      .createQueryBuilder()
      .update()
      .set({
        state,
        error_code: error,
        lease_id: null,
        lease_until: null,
        next_attempt_at: () =>
          `CURRENT_TIMESTAMP + (${Math.max(0, Math.floor(delay))} * interval '1 millisecond')`,
        completed_at:
          state === DeliveryState.RETRY_WAIT ? null : () => 'CURRENT_TIMESTAMP',
        updated_at: () => 'CURRENT_TIMESTAMP',
      })
      .where(
        '"id" = :id AND "organization_id" = :org AND "recipient_user_id" = :user AND "state" = :processing AND "lease_id" = :lease AND "lease_until" > CURRENT_TIMESTAMP',
        {
          id: row.id,
          org: row.organization_id,
          user: row.recipient_user_id,
          processing: DeliveryState.PROCESSING,
          lease: row.lease_id,
        },
      )
      .execute();
    return result.affected === 1;
  }
}
