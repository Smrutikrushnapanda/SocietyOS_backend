import { Injectable, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Payment } from '../database/entities/payment.entity';
import { MaintenanceDue } from '../database/entities/maintenance-due.entity';
import { Resident } from '../database/entities/resident.entity';
import { OrganizationContextService } from '../organization/organization-context.service';
import { Request } from 'express';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/audit.enums';
import { AuditCallContext, extractRequestMeta, recordAudit, resolveAuditContext, toSnapshot } from '../audit/audit-context';

@Injectable()
export class PaymentService {
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

  async create(
    createDto: {
      organization_id: string;
      resident_id?: string;
      flat_id?: string;
      maintenance_due_id: string;
      amount: number;
      payment_method: 'CASH' | 'UPI' | 'NET_BANKING' | 'CHEQUE' | 'CARD';
    },
    creatorUserId: string,
  ) {
    const orgContext =
      (await this.organizationContextService.getCurrentOrganization(
        {} as any,
      )) as any;

    // Verify maintenance due exists and org matches
    const due = await this.dataSource
      .getRepository('MaintenanceDue')
      .findOneBy({
        id: createDto.maintenance_due_id,
        organization_id:
          orgContext.isSuperAdmin && orgContext.targetOrganizationId
            ? orgContext.targetOrganizationId
            : orgContext.organization_id,
      });

    if (!due) {
      throw new ForbiddenException(
        'Maintenance due not found or access denied',
      );
    }

    // Verify resident/flat ownership if provided
    if (createDto.resident_id) {
      const resident = await this.dataSource.getRepository(Resident).findOneBy({
        id: createDto.resident_id,
        organization_id:
          orgContext.isSuperAdmin && orgContext.targetOrganizationId
            ? orgContext.targetOrganizationId
            : orgContext.organization_id,
      });

      if (!resident) {
        throw new ForbiddenException('Resident not found or access denied');
      }
    }

    if (createDto.flat_id) {
      const flat = await this.dataSource.getRepository('Flat').findOneBy({
        id: createDto.flat_id,
        organization_id:
          orgContext.isSuperAdmin && orgContext.targetOrganizationId
            ? orgContext.targetOrganizationId
            : orgContext.organization_id,
      });

      if (!flat) {
        throw new ForbiddenException('Flat not found or access denied');
      }
    }

    // Validate amount does not exceed outstanding amount
    const outstanding =
      due.calculated_amount + due.late_charge - due.late_charge_waived;

    if (createDto.amount > outstanding) {
      throw new ForbiddenException(
        `Payment amount ${createDto.amount} exceeds outstanding amount ${outstanding}`,
      );
    }

    // Check for duplicate payment on same due on same day
    const existingPayment = await this.dataSource
      .getRepository(Payment)
      .findOneBy({
        maintenance_due_id: createDto.maintenance_due_id,
        payment_date: new Date(),
      });

    if (existingPayment) {
      throw new ForbiddenException(
        'A payment already exists for this due today',
      );
    }

    const payment = this.dataSource.getRepository(Payment).create({
      id: '00000000-0000-0000-0000-000000000000',
      organization_id:
        orgContext.isSuperAdmin && orgContext.targetOrganizationId
          ? orgContext.targetOrganizationId
          : orgContext.organization_id,
      resident_id: createDto.resident_id,
      flat_id: createDto.flat_id,
      maintenance_due_id: createDto.maintenance_due_id,
      amount: createDto.amount,
      payment_method: createDto.payment_method,
      payment_status: 'PENDING',
      payment_date: new Date(),
      transaction_id: null,
      created_by: creatorUserId,
    });

    await this.dataSource.getRepository(Payment).save(payment);

    // If amount covers the full outstanding, mark due as paid
    if (createDto.amount >= outstanding) {
      due.status = 'PAID';
      due.payment_received_at = new Date();
      await this.dataSource.getRepository(MaintenanceDue).save(due);
    }

    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (payment as any).organization_id,
      }),
      action: AuditAction.CREATE,
      entity_type: AuditEntityType.PAYMENT,
      entity_id: (payment as any).id ?? null,
      old_values: null,
      new_values: toSnapshot(payment),
      ...extractRequestMeta(undefined),
    } as never);
    return payment;
  }

  async findOne(id: string, orgContext: any) {
    const condition =
      orgContext.isSuperAdmin && orgContext.targetOrganizationId
        ? orgContext.targetOrganizationId
        : orgContext.organization_id;

    const payment = await this.dataSource.getRepository(Payment).findOneBy({
      id,
      organization_id: condition,
    });

    if (!payment) {
      throw new ForbiddenException('Payment not found or access denied');
    }
    return payment;
  }

  async findAllByOrganization(organizationId: string, orgContext: any) {
    const condition =
      orgContext.isSuperAdmin && orgContext.targetOrganizationId
        ? orgContext.targetOrganizationId
        : orgContext.organization_id;

    const query = this.dataSource
      .getRepository(Payment)
      .createQueryBuilder('payment');
    query.where('payment.organization_id = :orgId', { orgId: condition });

    return query.getMany();
  }

  async findAllByResident(residentId: string, orgContext: any) {
    const condition =
      orgContext.isSuperAdmin && orgContext.targetOrganizationId
        ? orgContext.targetOrganizationId
        : orgContext.organization_id;

    const query = this.dataSource
      .getRepository(Payment)
      .createQueryBuilder('payment');
    query.where('payment.resident_id = :residentId', { residentId });

    if (!orgContext.isSuperAdmin && orgContext.organization_id) {
      query.andWhere('payment.organization_id = :orgId', {
        orgId: orgContext.organization_id,
      });
    }

    return query.getMany();
  }

  async markCompleted(paymentId: string, orgContext: any) {
    const payment = await this.findOne(paymentId, orgContext);

    if (payment.payment_status === 'COMPLETED') {
      return payment; // Already completed
    }

    const oldValues = toSnapshot(payment);
    payment.payment_status = 'COMPLETED';
    await this.dataSource.getRepository(Payment).save(payment);
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (payment as any).organization_id,
      }),
      action: AuditAction.MARK_COMPLETED,
      entity_type: AuditEntityType.PAYMENT,
      entity_id: (payment as any).id ?? null,
      old_values: oldValues,
      new_values: toSnapshot(payment),
      ...extractRequestMeta(undefined),
    } as never);
    return payment;
  }

  async markFailed(paymentId: string, orgContext: any) {
    const payment = await this.findOne(paymentId, orgContext);

    if (payment.payment_status === 'FAILED') {
      return payment; // Already failed
    }

    const oldValues = toSnapshot(payment);
    payment.payment_status = 'FAILED';
    await this.dataSource.getRepository(Payment).save(payment);
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (payment as any).organization_id,
      }),
      action: AuditAction.MARK_FAILED,
      entity_type: AuditEntityType.PAYMENT,
      entity_id: (payment as any).id ?? null,
      old_values: oldValues,
      new_values: toSnapshot(payment),
      ...extractRequestMeta(undefined),
    } as never);
    return payment;
  }
}
