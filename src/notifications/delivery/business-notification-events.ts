import { Injectable, Module } from '@nestjs/common';
import { createHash } from 'crypto';
import { isUUID } from 'class-validator';
import { DataSource, EntityManager } from 'typeorm';
import { DatabaseModule } from '../../database/database.module';
import { Resident } from '../../database/entities/resident.entity';
import { UserRole } from '../../database/entities/user-role.entity';
import { AuthorizationService } from '../../authorization/authorization.service';
import { Notice } from '../../database/entities/notice.entity';
import { Poll } from '../../database/entities/poll.entity';
import { Complaint } from '../../database/entities/complaint.entity';
import { AmenityBooking } from '../../database/entities/amenity-booking.entity';
import { VisitorVisit } from '../../database/entities/visitor-visit.entity';
import { NotificationCategory } from '../notification-preferences.policy';
import {
  NotificationDeliveryService,
  ResidentDeliveryEligibility,
} from './delivery.service';
import {
  PostgresDeliveryStore,
  type DeliverySubmission,
} from './delivery.store';

// Required eligibility adapter for any future business-event worker composition.
export class BusinessDeliveryEligibility extends ResidentDeliveryEligibility {
  constructor(private readonly businessSource: DataSource) {
    super(businessSource);
  }

  override async resident(row: DeliverySubmission): Promise<boolean> {
    if (!(await super.resident(row))) return false;
    const permission: Partial<Record<NotificationCategory, string>> = {
      NOTICE: 'notice:read',
      POLL: 'poll:read',
      EMERGENCY: 'notice:read',
      COMPLAINT: 'complaint:my',
      AMENITY: 'amenity:read',
      VISITOR_ARRIVAL: 'visitor:my',
      VISITOR_APPROVAL: 'visitor:my',
    };
    const required = permission[row.category];
    if (!required) return false;
    const membership = await this.businessSource
      .getRepository(UserRole)
      .findOne({
        where: {
          userId: row.recipient_user_id,
          organization_id: row.organization_id,
        },
        relations: { role: true },
      });
    if (membership?.role?.name !== 'RESIDENT' || !membership.role.isActive)
      return false;
    return (
      await new AuthorizationService(this.businessSource).getRolePermissions(
        membership.roleId,
      )
    ).includes(required);
  }

  async available(row: DeliverySubmission): Promise<boolean> {
    const scope = {
      id: row.reference_id,
      organization_id: row.organization_id,
    };
    if (row.category === NotificationCategory.POLL) {
      const poll = await this.businessSource.getRepository(Poll).findOneBy(scope);
      return !!poll && poll.status === 'PUBLISHED' && new Date(poll.ends_at) > new Date();
    }
    if ([NotificationCategory.NOTICE, NotificationCategory.EMERGENCY].includes(row.category)) {
      const notice = await this.businessSource
        .getRepository(Notice)
        .findOneBy(scope);
      return (
        !!notice &&
        (row.category !== NotificationCategory.EMERGENCY || notice.priority === 'EMERGENCY') &&
        notice.status === 'PUBLISHED' &&
        notice.expires_at > new Date()
      );
    }
    const resident = await this.businessSource
      .getRepository(Resident)
      .findOneBy({
        user_id: row.recipient_user_id,
        organization_id: row.organization_id,
        isActive: true,
      });
    if (!resident) return false;
    if (row.category === NotificationCategory.COMPLAINT) {
      return !!(await this.businessSource
        .getRepository(Complaint)
        .findOneBy({ ...scope, resident_id: resident.id }));
    }
    if (row.category === NotificationCategory.AMENITY) {
      return !!(await this.businessSource
        .getRepository(AmenityBooking)
        .findOneBy({ ...scope, resident_id: resident.id }));
    }
    if (
      [
        NotificationCategory.VISITOR_ARRIVAL,
        NotificationCategory.VISITOR_APPROVAL,
      ].includes(row.category)
    ) {
      const visit = await this.businessSource
        .getRepository(VisitorVisit)
        .findOneBy({ ...scope, host_resident_id: resident.id });
      if (!visit) return false;
      return row.category === NotificationCategory.VISITOR_ARRIVAL
        ? visit.visit_status === 'CONFIRMED' && !!visit.actual_entry_time
        : ['CONFIRMED', 'CANCELLED'].includes(visit.visit_status);
    }
    return false;
  }
}

export function notificationEventKey(event: string): string {
  const bytes = createHash('sha256')
    .update(`societyos:notification:${event}`)
    .digest();
  bytes[6] = (bytes[6] & 15) | 80;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = bytes.subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

@Injectable()
export class BusinessNotificationEvents {
  constructor(private readonly source: DataSource) {}

  enabled(organizationId: string): boolean {
    return (
      isUUID(organizationId) &&
      ['development', 'test'].includes(process.env.NODE_ENV ?? '') &&
      process.env.NOTIFICATION_EVENTS_ENABLED === 'true' &&
      (process.env.NOTIFICATION_EVENTS_ORGANIZATION_IDS ?? '')
        .split(',')
        .map((value) => value.trim())
        .includes(organizationId)
    );
  }

  async resident(
    manager: EntityManager,
    organizationId: string,
    residentId: string,
    category: NotificationCategory,
    referenceId: string,
    event: string,
  ): Promise<void> {
    if (!this.enabled(organizationId)) return;
    const resident = await manager.getRepository(Resident).findOneBy({
      id: residentId,
      organization_id: organizationId,
      isActive: true,
    });
    if (!resident) return;
    await this.user(
      manager,
      organizationId,
      resident.user_id,
      category,
      referenceId,
      event,
    );
  }

  async user(
    manager: EntityManager,
    organizationId: string,
    userId: string,
    category: NotificationCategory,
    referenceId: string,
    event: string,
  ): Promise<void> {
    if (!this.enabled(organizationId)) return;
    const eligibility = new BusinessDeliveryEligibility(this.source);
    const input = {
      organization_id: organizationId,
      recipient_user_id: userId,
      category,
      reference_id: referenceId,
      idempotency_key: notificationEventKey(event),
    };
    // Removed memberships are no longer recipients; infrastructure errors still abort admission.
    if (!(await eligibility.resident(input))) return;
    await new NotificationDeliveryService(
      new PostgresDeliveryStore(this.source, manager),
      eligibility,
    ).enqueue(input);
  }
}

@Module({
  imports: [DatabaseModule],
  providers: [BusinessNotificationEvents],
  exports: [BusinessNotificationEvents],
})
export class BusinessNotificationEventsModule {}
