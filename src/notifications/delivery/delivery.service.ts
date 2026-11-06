import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { IsEnum, IsUUID, validateSync } from 'class-validator';
import { DataSource, In } from 'typeorm';
import {
  NotificationCategory,
  MANDATORY_NOTIFICATION_CATEGORIES,
} from '../notification-preferences.policy';
import { NotificationPreferencesService } from '../notification-preferences.service';
import { UserRole } from '../../database/entities/user-role.entity';
import { Organization } from '../../database/entities/organization.entity';
import { PushToken } from '../../database/entities/push-token.entity';
import { PushTokenService } from '../push-token.service';
import type { DeliveryStore, DeliverySubmission } from './delivery.store';
import { NotificationDelivery } from '../../database/entities/notification-delivery.entity';

export class EnqueueDeliveryDto implements DeliverySubmission {
  @IsUUID() organization_id: string;
  @IsUUID() recipient_user_id: string;
  @IsUUID() reference_id: string;
  @IsUUID() idempotency_key: string;
  @IsEnum(NotificationCategory) category: NotificationCategory;
}
export interface DeliveryEligibility {
  available?(row: DeliverySubmission): Promise<boolean>;
  resident(row: DeliverySubmission): Promise<boolean>;
  enabled(row: DeliverySubmission): Promise<boolean>;
  tokens(row: DeliverySubmission, ids?: string[]): Promise<PushToken[]>;
  invalidate(token: string): Promise<void>;
}

export class ResidentDeliveryEligibility implements DeliveryEligibility {
  private readonly preferences: NotificationPreferencesService;
  private readonly pushTokens: PushTokenService;
  constructor(private readonly source: DataSource) {
    this.preferences = new NotificationPreferencesService(source);
    this.pushTokens = new PushTokenService(source);
  }
  async resident(row: DeliverySubmission): Promise<boolean> {
    const membership = await this.source.getRepository(UserRole).findOne({
      where: {
        userId: row.recipient_user_id,
        organization_id: row.organization_id,
      },
      relations: { role: true },
    });
    const organization = await this.source
      .getRepository(Organization)
      .findOneBy({ id: row.organization_id, isActive: true });
    return (
      !!organization &&
      membership?.role?.name === 'RESIDENT' &&
      membership.role.isActive
    );
  }
  async enabled(row: DeliverySubmission): Promise<boolean> {
    if (MANDATORY_NOTIFICATION_CATEGORIES.has(row.category)) return true;
    const preferences = await this.preferences.read(
      row.recipient_user_id,
      row.organization_id,
    );
    return (
      preferences.find((preference) => preference.category === row.category)
        ?.enabled ?? true
    );
  }
  async tokens(row: DeliverySubmission, ids?: string[]): Promise<PushToken[]> {
    if (ids && !ids.length) return [];
    const allowed = new Set(
      await this.pushTokens.getActiveTokensForUser(
        row.recipient_user_id,
        row.organization_id,
      ),
    );
    const records = await this.source.getRepository(PushToken).find({
      where: {
        user_id: row.recipient_user_id,
        organization_id: row.organization_id,
        is_active: true,
        ...(ids ? { id: In(ids) } : {}),
      },
    });
    return records.filter((record) => allowed.has(record.token));
  }
  invalidate(token: string): Promise<void> {
    return this.pushTokens.deactivateByTokenValues([token]);
  }
}

// Internal infrastructure only. No controller, module registration, or business producer.
export class NotificationDeliveryService {
  constructor(
    private readonly store: DeliveryStore,
    private readonly eligibility: DeliveryEligibility,
  ) {}
  async enqueue(input: unknown): Promise<NotificationDelivery> {
    if (typeof input !== 'object' || input === null || Array.isArray(input))
      throw new BadRequestException('Invalid delivery request');
    const dto = plainToInstance(EnqueueDeliveryDto, input);
    if (
      validateSync(dto, { whitelist: true, forbidNonWhitelisted: true }).length
    )
      throw new BadRequestException('Invalid delivery request');
    try {
      if (!(await this.eligibility.resident(dto)))
        throw new ForbiddenException(
          'Resident organization membership required',
        );
      const enabled = await this.eligibility.enabled(dto);
      return await this.store.enqueue(dto, !enabled);
    } catch (error: unknown) {
      if (
        error instanceof ForbiddenException ||
        error instanceof ConflictException
      )
        throw error;
      throw new ServiceUnavailableException(
        'Notification delivery admission unavailable',
      );
    }
  }
}
