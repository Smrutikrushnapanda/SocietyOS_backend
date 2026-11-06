import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UserRole } from '../database/entities/user-role.entity';
import { ResidentNotificationPreference } from '../database/entities/resident-notification-preference.entity';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import {
  EffectiveNotificationPreference,
  isNotificationCategory,
  MANDATORY_NOTIFICATION_CATEGORIES,
  NotificationCategory,
} from './notification-preferences.policy';

@Injectable()
export class NotificationPreferencesService {
  private readonly logger = new Logger(NotificationPreferencesService.name);

  constructor(private readonly dataSource: DataSource) {}

  private async requireResident(
    userId: string,
    organizationId: string,
  ): Promise<void> {
    if (!userId) throw new UnauthorizedException('Authentication required');
    if (!organizationId) throw new ForbiddenException('Organization required');
    let membership: UserRole | null;
    try {
      membership = await this.dataSource.getRepository(UserRole).findOne({
        where: { userId, organization_id: organizationId },
        relations: { role: true },
      });
    } catch {
      throw new ServiceUnavailableException(
        'Notification preferences unavailable',
      );
    }
    if (membership?.role?.name !== 'RESIDENT' || !membership.role.isActive) {
      throw new ForbiddenException('Resident membership required');
    }
  }

  private effective(
    rows: ResidentNotificationPreference[],
  ): EffectiveNotificationPreference[] {
    if (
      rows.some(
        (row) =>
          !isNotificationCategory(row.category) ||
          typeof row.enabled !== 'boolean',
      )
    ) {
      throw new ServiceUnavailableException(
        'Notification preferences unavailable',
      );
    }
    return Object.values(NotificationCategory).map((category) => {
      const mandatory = MANDATORY_NOTIFICATION_CATEGORIES.has(category);
      return {
        category,
        mandatory,
        enabled:
          mandatory ||
          (rows.find((row) => row.category === category)?.enabled ?? true),
      };
    });
  }

  async read(
    userId: string,
    organizationId: string,
  ): Promise<EffectiveNotificationPreference[]> {
    await this.requireResident(userId, organizationId);
    try {
      const rows = await this.dataSource
        .getRepository(ResidentNotificationPreference)
        .find({
          where: { user_id: userId, organization_id: organizationId },
        });
      return this.effective(rows);
    } catch {
      throw new ServiceUnavailableException(
        'Notification preferences unavailable',
      );
    }
  }

  async update(
    userId: string,
    organizationId: string,
    body: UpdateNotificationPreferencesDto,
  ): Promise<EffectiveNotificationPreference[]> {
    await this.requireResident(userId, organizationId);
    const updates = body?.updates;
    if (
      !Array.isArray(updates) ||
      updates.length < 1 ||
      updates.length > 10 ||
      updates.some(
        (update) =>
          !update ||
          !isNotificationCategory(update.category) ||
          typeof update.enabled !== 'boolean',
      ) ||
      new Set(updates.map((update) => update.category)).size !== updates.length
    ) {
      throw new BadRequestException('Invalid notification preferences');
    }
    if (
      updates.some(
        (update) =>
          MANDATORY_NOTIFICATION_CATEGORIES.has(update.category) &&
          !update.enabled,
      )
    ) {
      throw new BadRequestException(
        'Mandatory notifications cannot be disabled',
      );
    }
    try {
      return await this.dataSource.transaction(async (manager) => {
        const repository = manager.getRepository(
          ResidentNotificationPreference,
        );
        // A single ON CONFLICT statement changes only submitted categories; no read/replace race.
        await repository.upsert(
          [...updates]
            .sort((a, b) => a.category.localeCompare(b.category))
            .map((update) => ({
              user_id: userId,
              organization_id: organizationId,
              category: update.category,
              enabled: update.enabled,
            })),
          ['user_id', 'organization_id', 'category'],
        );
        return this.effective(
          await repository.find({
            where: { user_id: userId, organization_id: organizationId },
          }),
        );
      });
    } catch {
      throw new ServiceUnavailableException(
        'Notification preferences unavailable',
      );
    }
  }

  async allowsPush(
    userId: string,
    organizationId: string,
    type: string,
  ): Promise<boolean> {
    // Legacy types have no inferred category mapping; never classify by substrings.
    if (
      !isNotificationCategory(type) ||
      MANDATORY_NOTIFICATION_CATEGORIES.has(type)
    )
      return true;
    try {
      const preferences = await this.read(userId, organizationId);
      return (
        preferences.find((preference) => preference.category === type)
          ?.enabled ?? true
      );
    } catch (error: unknown) {
      if (error instanceof ForbiddenException) return true; // Non-resident generic recipients retain existing behavior.
      this.logger.warn(
        'Push preference lookup unavailable; using enabled delivery policy',
      );
      return true;
    }
  }
}
