import { Injectable, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Complaint } from '../database/entities/complaint.entity';
import { ComplaintStatusHistory } from '../database/entities/complaint-status-history.entity';
import { CreateComplaintDto } from './dto';
import { UpdateComplaintDto } from './dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/audit.enums';
import { AuditCallContext, extractRequestMeta, recordAudit, resolveAuditContext, toSnapshot } from '../audit/audit-context';

@Injectable()
export class ComplaintService {
  constructor(
    private readonly dataSource: DataSource,
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

  async create(createDto: CreateComplaintDto, authenticatedResidentId: string, orgContext: any): Promise<Complaint> {
    // Resident can only create complaints for themselves
    if (createDto.resident_id !== authenticatedResidentId) {
      throw new ForbiddenException('Residents can only create complaints for themselves');
    }

    // organization_id is derived from orgContext
    const orgId = orgContext?.organizationId;

    const complaint: Complaint = this.dataSource
      .getRepository(Complaint)
      .create({
        id: createDto.id,
        organization_id: orgId,
        resident_id: createDto.resident_id,
        flat_id: createDto.flat_id,
        category: createDto.category,
        subject: createDto.subject,
        description: createDto.description,
        status: 'OPEN',
        priority: createDto.priority || 'MEDIUM',
        assigned_to: createDto.assigned_to,
        resolved_at: null,
        created_at: new Date(),
        updated_at: new Date,
      });
    const saved = await this.dataSource.getRepository(Complaint).save(complaint);
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (saved as any).organization_id,
      }),
      action: AuditAction.CREATE,
      entity_type: AuditEntityType.COMPLAINT,
      entity_id: (saved as any).id ?? null,
      old_values: null,
      new_values: toSnapshot(saved),
      ...extractRequestMeta(undefined),
    } as never);
    return saved;
  }

  async findAll(orgContext: any): Promise<Complaint[]> {
    const orgId = orgContext.organizationId;
    return this.dataSource
      .getRepository(Complaint)
      .find({ where: { organization_id: orgId } });
  }

  async findOne(id: string, orgContext: any): Promise<Complaint | null> {
    const orgId = orgContext.organizationId;
    return this.dataSource
      .getRepository(Complaint)
      .findOne({ where: { id, organization_id: orgId } });
  }

  async update(id: string, updateDto: UpdateComplaintDto, orgContext: any): Promise<Complaint | null> {
    const orgId = orgContext.organizationId;
    const complaint = await this.findOne(id, orgContext);
    if (!complaint) return null;

    // Only society admin can manage complaints (enforced by permission guard)
    const oldValues = toSnapshot(complaint);
    if (updateDto.status) complaint.status = updateDto.status;
    if (updateDto.priority) complaint.priority = updateDto.priority;
    if (updateDto.assigned_to) complaint.assigned_to = updateDto.assigned_to;
    complaint.updated_at = new Date();
    const saved = await this.dataSource.getRepository(Complaint).save(complaint);
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (saved as any).organization_id,
      }),
      action: AuditAction.UPDATE,
      entity_type: AuditEntityType.COMPLAINT,
      entity_id: (saved as any).id ?? null,
      old_values: oldValues,
      new_values: toSnapshot(saved),
      ...extractRequestMeta(undefined),
    } as never);
    return saved;
  }

  async assign(id: string, assignedTo: string, orgContext: any): Promise<Complaint | null> {
    const orgId = orgContext.organizationId;
    const complaint = await this.findOne(id, orgContext);
    if (!complaint) return null;
    const oldValues = toSnapshot(complaint);
    complaint.assigned_to = assignedTo;
    complaint.updated_at = new Date();
    const saved = await this.dataSource.getRepository(Complaint).save(complaint);
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (saved as any).organization_id,
      }),
      action: AuditAction.ASSIGN,
      entity_type: AuditEntityType.COMPLAINT,
      entity_id: (saved as any).id ?? null,
      old_values: oldValues,
      new_values: toSnapshot(saved),
      ...extractRequestMeta(undefined),
    } as never);
    return saved;
  }

  async resolve(id: string, reason: string, orgContext: any): Promise<Complaint | null> {
    const orgId = orgContext.organizationId;
    const complaint = await this.findOne(id, orgContext);
    if (!complaint) return null;

    // Status transition validation
    const allowedTransitions: Record<string, string[]> = {
      OPEN: ['IN_PROGRESS', 'REJECTED'],
      IN_PROGRESS: ['RESOLVED'],
      RESOLVED: ['CLOSED'],
    };

    const currentStatus = complaint.status;
    const allowedNext = allowedTransitions[currentStatus];
    if (!allowedNext) {
      throw new ForbiddenException(`No further transitions from status ${currentStatus}`);
    }

    // Residents must NOT be able to resolve/reject/close complaints.
    // The permission guard (RequirePermission('complaint:manage')) should prevent
    // residents from calling this endpoint. This is defense in depth.

    const oldValues = toSnapshot(complaint);
    const newStatus = allowedNext[0];
    complaint.status = newStatus;
    complaint.updated_at = new Date;
    // Create status history entry
    await this.dataSource.getRepository(ComplaintStatusHistory).save({
      id: complaint.id,
      complaint_id: complaint.id,
      previous_status: complaint.status,
      new_status: newStatus,
      changed_by: '',
      changed_at: new Date(),
      reason,
    });
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (complaint as any).organization_id,
      }),
      action: AuditAction.RESOLVE,
      entity_type: AuditEntityType.COMPLAINT,
      entity_id: (complaint as any).id ?? null,
      old_values: oldValues,
      new_values: toSnapshot(complaint),
      ...extractRequestMeta(undefined),
    } as never);
    return complaint;
  }
}