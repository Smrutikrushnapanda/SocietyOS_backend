import { Injectable, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MaintenanceDue } from '../database/entities/maintenance-due.entity';
import { Flat } from '../database/entities/flat.entity';
import { MaintenanceConfiguration } from '../database/entities/maintenance-configuration.entity';
import { OrganizationContextService } from '../organization/organization-context.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/audit.enums';
import { AuditCallContext, extractRequestMeta, recordAudit, resolveAuditContext, toSnapshot } from '../audit/audit-context';

@Injectable()
export class MaintenanceDueService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly organizationContextService: OrganizationContextService,
    private readonly auditService: AuditService,
  ) {}

  private buildAuditOptions(passed?: AuditCallContext, entityOrganizationId?: string | null, actorUserId?: string | null): AuditCallContext {
    return {
      orgContext: (passed?.orgContext ?? null) as any,
      actorUserId: passed?.actorUserId ?? actorUserId ?? null,
      entityOrganizationId: passed?.entityOrganizationId ?? entityOrganizationId ?? null,
      request: passed?.request,
    };
  }

  private emitAudit(action: AuditAction, entityType: AuditEntityType, entityId: string | null, oldValues: Record<string, unknown> | null, newValues: Record<string, unknown> | null, options?: AuditCallContext): void {
    const opts = this.buildAuditOptions(options, (newValues as any)?.organization_id ?? (oldValues as any)?.organization_id ?? options?.entityOrganizationId ?? null, options?.actorUserId ?? null);
    const ctx = resolveAuditContext({ orgContext: opts.orgContext as any, actorUserId: opts.actorUserId ?? undefined, entityOrganizationId: opts.entityOrganizationId ?? undefined });
    const meta = extractRequestMeta(opts.request);
    void recordAudit(this.auditService as any, { ...ctx, action, entity_type: entityType, entity_id: entityId, old_values: oldValues, new_values: newValues, ...meta } as never);
  }

  async generateDue(
    flatId: string,
    billingPeriodStart: Date,
    billingPeriodEnd: Date,
  ) {
    const orgContext =
      (await this.organizationContextService.getCurrentOrganization(
        {} as any,
      )) as any;

    // Find the flat
    const flat = await this.dataSource.getRepository(Flat).findOneBy({
      id: flatId,
      organization_id:
        orgContext.isSuperAdmin && orgContext.targetOrganizationId
          ? orgContext.targetOrganizationId
          : orgContext.organization_id,
    });

    if (!flat) {
      throw new ForbiddenException('Flat not found or access denied');
    }

    // Check for duplicate due for same billing period
    const existingDue = await this.dataSource
      .getRepository(MaintenanceDue)
      .findOneBy({
        flat_id: flatId,
        billing_period_start: billingPeriodStart,
        billing_period_end: billingPeriodEnd,
      });

    if (existingDue) {
      throw new ForbiddenException(
        'A maintenance due already exists for this flat and billing period',
      );
    }

    // Get maintenance configuration for the flat's organization
    const config = await this.dataSource
      .getRepository(MaintenanceConfiguration)
      .findOneBy({
        organization_id: flat.organization_id,
        is_active: true,
      });

    if (!config) {
      throw new ForbiddenException(
        'No active maintenance configuration found for organization',
      );
    }

    // Calculate: base × multiplier
    const calculatedAmount =
      Math.round(
        config.base_maintenance_amount * flat.maintenance_multiplier * 100,
      ) / 100;

    // Determine due date using organization's due day
    const dueDate = this.calculateDueDate(
      billingPeriodStart,
      config.due_day_of_month,
    );

    const due = this.dataSource.getRepository(MaintenanceDue).create({
      id: '00000000-0000-0000-0000-000000000000',
      flat_id: flatId,
      organization_id: flat.organization_id,
      base_maintenance_amount: config.base_maintenance_amount,
      maintenance_multiplier: flat.maintenance_multiplier,
      calculated_amount: calculatedAmount,
      billing_period_start: billingPeriodStart,
      billing_period_end: billingPeriodEnd,
      due_date: dueDate,
      late_charge: 0,
      late_charge_waived: 0,
      status: 'PENDING',
    });

    await this.dataSource.getRepository(MaintenanceDue).save(due);
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (due as any).organization_id,
      }),
      action: AuditAction.GENERATE,
      entity_type: AuditEntityType.MAINTENANCE_DUE,
      entity_id: (due as any).id ?? null,
      old_values: null,
      new_values: toSnapshot(due),
      ...extractRequestMeta(undefined),
    } as never);
    return due;
  }

  private calculateDueDate(billingPeriodStart: Date, dueDay: number): Date {
    const start = new Date(billingPeriodStart);
    // Set the due date to the configured day of the billing period month
    start.setDate(dueDay);
    // If due day is after the last day of the month, JS will handle it (sets to last day of month)
    // e.g., if dueDay=31 and month has 30 days, it becomes day 30

    return start;
  }

  async findOne(id: string, orgContext: any) {
    const flatIdCondition =
      orgContext.isSuperAdmin && orgContext.targetOrganizationId
        ? orgContext.targetOrganizationId
        : orgContext.organization_id;

    const due = await this.dataSource.getRepository(MaintenanceDue).findOneBy({
      id,
      organization_id: flatIdCondition,
    });

    if (!due) {
      throw new ForbiddenException(
        'Maintenance due not found or access denied',
      );
    }
    return due;
  }

  async findAllByOrganization() {
    const orgContext =
      (await this.organizationContextService.getCurrentOrganization(
        {} as any,
      )) as any;

    const flatIdCondition =
      orgContext.isSuperAdmin && orgContext.targetOrganizationId
        ? orgContext.targetOrganizationId
        : orgContext.organization_id;

    const query = this.dataSource
      .getRepository(MaintenanceDue)
      .createQueryBuilder('due');

    if (!orgContext.isSuperAdmin && orgContext.organization_id) {
      query.where('due.organization_id = :orgId', {
        orgId: orgContext.organization_id,
      });
    }

    return query.getMany();
  }

  async findAllByFlat(flatId: string, orgContext: any) {
    const organizationId =
      orgContext.isSuperAdmin && orgContext.targetOrganizationId
        ? orgContext.targetOrganizationId
        : orgContext.organization_id;

    const query = this.dataSource
      .getRepository(MaintenanceDue)
      .createQueryBuilder('due');
    query.where('due.flat_id = :flatId', { flatId });

    if (!orgContext.isSuperAdmin && orgContext.organization_id) {
      query.andWhere('due.organization_id = :orgId', { orgId: organizationId });
    }

    return query.getMany();
  }

  async markPaid(dueId: string, orgContext: any) {
    const due = await this.findOne(dueId, orgContext);

    if (due.status === 'PAID') {
      return due; // Already paid
    }

    const oldValues = toSnapshot(due);
    due.status = 'PAID';
    due.payment_received_at = new Date();
    await this.dataSource.getRepository(MaintenanceDue).save(due);
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (due as any).organization_id,
      }),
      action: AuditAction.MARK_PAID,
      entity_type: AuditEntityType.MAINTENANCE_DUE,
      entity_id: (due as any).id ?? null,
      old_values: oldValues,
      new_values: toSnapshot(due),
      ...extractRequestMeta(undefined),
    } as never);
    return due;
  }

  async markOverdue(dueId: string, orgContext: any) {
    const due = await this.findOne(dueId, orgContext);

    if (due.status === 'OVERDUE') {
      return due; // Already overdue
    }

    const oldValues = toSnapshot(due);
    // Check if past due date
    const now = new Date();
    if (now > due.due_date) {
      due.status = 'OVERDUE';
      // Calculate late charge if grace period has passed
      await this.calculateAndApplyLateCharge(due, now);
    }

    await this.dataSource.getRepository(MaintenanceDue).save(due);
    if (due.status === 'OVERDUE') {
      await recordAudit(this.auditService as any, {
        ...resolveAuditContext({
          orgContext,
          entityOrganizationId: (due as any).organization_id,
        }),
        action: AuditAction.MARK_OVERDUE,
        entity_type: AuditEntityType.MAINTENANCE_DUE,
        entity_id: (due as any).id ?? null,
        old_values: oldValues,
        new_values: toSnapshot(due),
        ...extractRequestMeta(undefined),
      } as never);
    }
    return due;
  }

  private async calculateAndApplyLateCharge(due: MaintenanceDue, now: Date) {
    const config = await this.dataSource
      .getRepository(MaintenanceConfiguration)
      .findOneBy({
        organization_id: due.organization_id,
      });

    if (!config) return;

    // Check grace period
    const graceDays = config.late_charge_grace_days || 0;
    const graceCutoff = new Date(due.due_date);
    graceCutoff.setDate(graceCutoff.getDate() + graceDays);

    if (now <= graceCutoff) {
      return; // Grace period still active, no late charge
    }

    // Calculate late charge
    let lateCharge = 0;

    if (config.late_charge_type === 'FIXED') {
      lateCharge = config.late_charge_value;
    } else if (config.late_charge_type === 'PERCENTAGE') {
      // Percentage of calculated_amount, rounded to 2 decimal places
      lateCharge =
        Math.round(
          ((due.calculated_amount * config.late_charge_value) / 100) * 100,
        ) / 100;
    }

    due.late_charge = lateCharge;
    await this.dataSource.getRepository(MaintenanceDue).save(due);
  }

  async waiveLateCharge(dueId: string, adminUserId: string, reason?: string) {
    const orgContext =
      (await this.organizationContextService.getCurrentOrganization(
        {} as any,
      )) as any;

    const due = await this.findOne(dueId, orgContext);

    // Only SOCIETY_ADMIN or SUPER_ADMIN can waive
    const userRoleRepo = this.dataSource.getRepository('UserRole');
    const userRole = await userRoleRepo.findOneBy({ userId: adminUserId });

    if (!userRole) {
      throw new ForbiddenException('User role not found');
    }

    const roleRepo = this.dataSource.getRepository('Role');
    const role = await roleRepo.findOneBy({ id: userRole.roleId });

    if (!role) {
      throw new ForbiddenException('Role not found');
    }

    if (role.name !== 'SUPER_ADMIN' && role.name !== 'SOCIETY_ADMIN') {
      throw new ForbiddenException(
        'Only SOCIETY_ADMIN or SUPER_ADMIN can waive late charges',
      );
    }

    // Check if already fully waived
    if (due.late_charge_waived >= due.late_charge) {
      throw new ForbiddenException('Late charge has already been fully waived');
    }

    const oldValues = toSnapshot(due);
    // Waive the late charge
    due.late_charge_waived = due.late_charge; // Full waiver
    due.late_charge_waived_by = adminUserId;
    due.late_charge_waived_at = new Date();
    due.late_charge_waiver_reason = reason ?? null;

    // Due status remains PENDING or OVERDUE - waiver only affects late charge
    // calculated_amount is NOT changed

    await this.dataSource.getRepository(MaintenanceDue).save(due);
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (due as any).organization_id,
      }),
      action: AuditAction.WAIVE_LATE_CHARGE,
      entity_type: AuditEntityType.MAINTENANCE_DUE,
      entity_id: (due as any).id ?? null,
      old_values: oldValues,
      new_values: toSnapshot(due),
      ...extractRequestMeta(undefined),
    } as never);
    return due;
  }
}
