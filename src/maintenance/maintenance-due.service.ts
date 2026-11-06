import { randomUUID } from 'crypto';
import { MaintenanceAccrualService } from './maintenance-accrual.service';
import { calculateLateCharge, snapshotLatePolicy } from './late-charge.policy';
import { Injectable, ForbiddenException, NotFoundException, Optional } from '@nestjs/common';
import { WhatsAppEventsService } from '../whatsapp/whatsapp-events.service';
import { DataSource } from 'typeorm';
import { MaintenanceDue } from '../database/entities/maintenance-due.entity';
import { Flat } from '../database/entities/flat.entity';
import { Resident } from '../database/entities/resident.entity';
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
    @Optional() private readonly whatsappEvents?: WhatsAppEventsService,
    @Optional() private readonly accrual?: MaintenanceAccrualService,
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
    passedOrgContext?: any,
  ) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

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
      id: randomUUID(),
      flat_id: flatId,
      organization_id: flat.organization_id,
      base_maintenance_amount: config.base_maintenance_amount,
      maintenance_multiplier: flat.maintenance_multiplier,
      calculated_amount: calculatedAmount,
      billing_period_start: billingPeriodStart,
      billing_period_end: billingPeriodEnd,
      due_date: dueDate,
      late_charge: calculateLateCharge(snapshotLatePolicy(config), calculatedAmount, dueDate),
      late_charge_policy: snapshotLatePolicy(config),
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
    void this.whatsappEvents?.flat(due.organization_id, due.flat_id, 'MAINTENANCE_DUE',
      `*Maintenance due*\n\nAmount: ₹${due.calculated_amount}\nDue date: ${due.due_date.toISOString().slice(0, 10)}\nOpen SocietyOS for details.`, { key: 'maintenanceDue', variables: { amount: String(due.calculated_amount), due_date: due.due_date.toISOString().slice(0, 10) } });
    return due;
  }

  private calculateDueDate(billingPeriodStart: Date, dueDay: number): Date {
    const start = new Date(billingPeriodStart);
    const year = start.getUTCFullYear(), month = start.getUTCMonth();
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return new Date(Date.UTC(year, month, Math.min(dueDay, lastDay)));
  }

  async findOne(id: string, orgContext: any) {
    const flatIdCondition =
      orgContext.isSuperAdmin && orgContext.targetOrganizationId
        ? orgContext.targetOrganizationId
        : orgContext.organization_id;

    await this.accrual?.refresh(flatIdCondition);
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

  async findAllByOrganization(passedOrgContext?: any) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    const flatIdCondition =
      orgContext.isSuperAdmin && orgContext.targetOrganizationId
        ? orgContext.targetOrganizationId
        : orgContext.organization_id;

    const query = this.dataSource
      .getRepository(MaintenanceDue)
      .createQueryBuilder('due');

    if (!flatIdCondition) throw new ForbiddenException('Organization context is required');
    await this.accrual?.refresh(flatIdCondition);
    query.where('due.organization_id = :orgId', { orgId: flatIdCondition });

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

    if (!organizationId) throw new ForbiddenException('Organization context is required');
    await this.accrual?.refresh(organizationId);
    query.andWhere('due.organization_id = :orgId', { orgId: organizationId });

    return query.getMany();
  }

  async findMyDues(userId: string, passedOrgContext?: any) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    const organizationId =
      orgContext.targetOrganizationId ??
      orgContext.organizationId ??
      orgContext.organization_id;

    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }

    const resident = await this.dataSource.getRepository(Resident).findOneBy({
      user_id: userId,
      organization_id: organizationId,
    });

    if (!resident) {
      throw new NotFoundException('Resident record not found');
    }

    if (!resident.flat_id) {
      return [];
    }

    await this.accrual?.refresh(organizationId);
    const repo = this.dataSource.getRepository(MaintenanceDue);
    if (typeof repo.createQueryBuilder === 'function') {
      const query = repo.createQueryBuilder('due');
      query.where('due.organization_id = :orgId AND due.flat_id = :flatId', {
        orgId: organizationId,
        flatId: resident.flat_id,
      });
      return query.orderBy('due.createdAt', 'DESC').getMany();
    }

    return repo.findBy({
      organization_id: organizationId,
      flat_id: resident.flat_id,
    } as any);
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

    if (due.status === 'PAID') return due;
    if (due.status === 'OVERDUE') {
      return due; // Already overdue
    }

    const oldValues = toSnapshot(due);
    // Check if past due date
    const now = new Date();
    if (now > new Date(due.due_date)) {
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
      void this.whatsappEvents?.flat(due.organization_id, due.flat_id, 'MAINTENANCE_OVERDUE',
        '*Maintenance overdue*\n\nYour maintenance payment is overdue. Open SocietyOS to view outstanding dues.', { key: 'maintenanceOverdue', variables: { amount: String(Number(due.calculated_amount) + Number(due.late_charge) - Number(due.late_charge_waived)), due_date: new Date(due.due_date).toISOString().slice(0, 10) } });
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

    const policy = due.late_charge_policy ?? snapshotLatePolicy(config);
    due.late_charge_policy = policy;
    if (!policy.exempt) due.late_charge = Math.max(Number(due.late_charge), calculateLateCharge(policy, Number(due.calculated_amount), due.due_date, now));
    await this.dataSource.getRepository(MaintenanceDue).save(due);
  }

  async waiveLateCharge(
    dueId: string,
    adminUserId: string,
    reason?: string,
    passedOrgContext?: any,
    stopFutureCharges = true,
  ) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    const due = await this.findOne(dueId, orgContext);

    // Phase 11 Step 2: the role check must use the membership of the target
    // organization, not an arbitrary membership of a multi-org user.
    const targetOrganizationId = orgContext.isSuperAdmin
      ? orgContext.targetOrganizationId
      : orgContext.organization_id;
    if (!targetOrganizationId) {
      throw new ForbiddenException('Organization context is required');
    }

    // Only SOCIETY_ADMIN or SUPER_ADMIN can waive.
    // The membership used must be the one for the target organization; a
    // platform-scoped SUPER_ADMIN membership (organization_id NULL) is only
    // honored when the user actually holds the SUPER_ADMIN role.
    const userRoleRepo = this.dataSource.getRepository('UserRole');
    const roleRepo = this.dataSource.getRepository('Role');

    let userRole;
    if (orgContext.isSuperAdmin) {
      // Acting as platform-scoped SUPER_ADMIN: the platform membership
      // (organization_id NULL) is the one in effect.
      userRole = await userRoleRepo.findOneBy({
        userId: adminUserId,
        organization_id: null as any,
      });
    } else {
      // Normal user: only the membership of the target organization counts.
      userRole = await userRoleRepo.findOneBy({
        userId: adminUserId,
        organization_id: targetOrganizationId,
      });
    }

    if (!userRole) {
      throw new ForbiddenException('User role not found');
    }

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
    if (Number(due.late_charge_waived) >= Number(due.late_charge)) {
      throw new ForbiddenException('Late charge has already been fully waived');
    }

    const oldValues = toSnapshot(due);
    // Waive the late charge
    due.late_charge_waived = due.late_charge; // Full waiver
    due.late_charge_waived_by = adminUserId;
    due.late_charge_waived_at = new Date();
    due.late_charge_waiver_reason = reason ?? null;
    if (due.late_charge_policy) due.late_charge_policy = { ...due.late_charge_policy, exempt: stopFutureCharges };

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
