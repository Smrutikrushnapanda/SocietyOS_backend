import { ResidentPageDto, residentPage } from '../common/resident-page';
import { BadRequestException as FeedBadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { MaintenanceAccrualService } from './maintenance-accrual.service';
import { Injectable, ForbiddenException, NotFoundException, Optional } from '@nestjs/common';
import { WhatsAppEventsService } from '../whatsapp/whatsapp-events.service';
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

  async findMyPage(userId: string, context: any, query: ResidentPageDto) {
    if (!['all', 'PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'].includes(query.tab ?? 'all')) throw new FeedBadRequestException('Invalid payment history tab');
    return residentPage(this.dataSource, Payment, userId, context, query, 'resident_id', 'created_at', qb => {
      if (query.tab && query.tab !== 'all') qb.andWhere('record.payment_status = :status', { status: query.tab });
    });
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
    passedOrgContext?: any,
  ) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    await this.accrual?.refresh(orgContext.targetOrganizationId ?? orgContext.organizationId ?? orgContext.organization_id);
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

    // Verify flat matches due if provided
    if (createDto.flat_id && due.flat_id && createDto.flat_id !== due.flat_id) {
      throw new ForbiddenException('Flat ID does not match the maintenance due flat');
    }
    const resolvedFlatId = due.flat_id || createDto.flat_id;

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
      if (resident.flat_id && resolvedFlatId && resident.flat_id !== resolvedFlatId) {
        throw new ForbiddenException('Resident does not belong to the flat for this maintenance due');
      }
    }

    // Validate amount does not exceed outstanding amount
    const outstanding =
      Number(due.calculated_amount) + Number(due.late_charge) - Number(due.late_charge_waived);

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
      id: randomUUID(),
      organization_id:
        orgContext.isSuperAdmin && orgContext.targetOrganizationId
          ? orgContext.targetOrganizationId
          : orgContext.organization_id,
      resident_id: createDto.resident_id,
      flat_id: resolvedFlatId,
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
    this.notifyPayment(payment, 'recorded');
    return payment;
  }

  private notifyPayment(payment: Payment, state: string): void {
    const message = `*Payment ${state}*\n\nAmount: ₹${payment.amount}\nReference: ${payment.id}\nOpen SocietyOS for receipt details.`;
    if (payment.resident_id) {
      void this.whatsappEvents?.resident(payment.organization_id, payment.resident_id, 'PAYMENT_CONFIRMATION', message);
    } else if (payment.flat_id) {
      void this.whatsappEvents?.flat(payment.organization_id, payment.flat_id, 'PAYMENT_CONFIRMATION', message);
    }
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

  async findMyPayments(userId: string, passedOrgContext?: any) {
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

    const repo = this.dataSource.getRepository(Payment);
    if (typeof repo.createQueryBuilder === 'function') {
      const query = repo.createQueryBuilder('payment');
      query.where(
        'payment.organization_id = :orgId AND payment.resident_id = :residentId',
        {
          orgId: organizationId,
          residentId: resident.id,
        },
      );
      return query.orderBy('payment.created_at', 'DESC').getMany();
    }

    return repo.findBy({
      organization_id: organizationId,
      resident_id: resident.id,
    } as any);
  }

  async findAllByResident(residentId: string, orgContext: any) {
    const condition =
      orgContext.isSuperAdmin && orgContext.targetOrganizationId
        ? orgContext.targetOrganizationId
        : orgContext.organization_id;

    if (!condition) {
      throw new ForbiddenException('Organization context is required');
    }

    const resident = await this.dataSource.getRepository(Resident).findOneBy({
      id: residentId,
      organization_id: condition,
    });

    if (!resident) {
      throw new NotFoundException('Resident not found in this organization');
    }

    const query = this.dataSource
      .getRepository(Payment)
      .createQueryBuilder('payment');
    query.where(
      'payment.resident_id = :residentId AND payment.organization_id = :orgId',
      {
        residentId,
        orgId: condition,
      },
    );

    return query.orderBy('payment.created_at', 'DESC').getMany();
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
    this.notifyPayment(payment, 'completed');
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
