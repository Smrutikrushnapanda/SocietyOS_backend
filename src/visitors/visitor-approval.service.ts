import { VisitorLiveEvents } from './live/visitor-live.events';
import { randomUUID } from 'crypto';
import { Injectable, ForbiddenException, Optional } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { VisitorApproval } from '../database/entities/visitor-approval.entity';
import { VisitorVisit } from '../database/entities/visitor-visit.entity';
import { OrganizationContextService } from '../organization/organization-context.service';
import { Request } from 'express';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/audit.enums';
import { AuditCallContext, extractRequestMeta, recordAudit, resolveAuditContext, toSnapshot } from '../audit/audit-context';

@Injectable()
export class VisitorApprovalService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly organizationContextService: OrganizationContextService,
    private readonly auditService: AuditService,
    @Optional() private readonly live?: VisitorLiveEvents,
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

  async createVisitorApproval(
    createVisitorApprovalDto: {
      organization_id: string;
      visitor_visit_id: string;
      approval_status: string;
      approver_id?: string;
      approved_at?: string;
      rejected_at?: string;
    },
    passedOrgContext?: any,
  ) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    // Phase 11 Step 2: the authoritative organization always comes from the
    // guard-resolved context. A client-supplied organization_id never grants
    // authorization and must match the context when present.
    const targetOrganizationId = orgContext.isSuperAdmin
      ? orgContext.targetOrganizationId
      : orgContext.organization_id;
    if (!targetOrganizationId) {
      throw new ForbiddenException('Organization context is required');
    }
    if (
      createVisitorApprovalDto.organization_id &&
      createVisitorApprovalDto.organization_id !== targetOrganizationId
    ) {
      throw new ForbiddenException(
        'You can only create visitor approvals in your organization',
      );
    }

    // Validate visitor_visit belongs to the target organization
    const visitRepository = this.dataSource.getRepository(VisitorVisit);
    const visitorVisit = await visitRepository.findOneBy({
      id: createVisitorApprovalDto.visitor_visit_id,
      organization_id: targetOrganizationId,
    });

    if (!visitorVisit) {
      throw new ForbiddenException('Visitor visit not found or access denied');
    }

    // Validate approval status
    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
    if (!validStatuses.includes(createVisitorApprovalDto.approval_status)) {
      throw new ForbiddenException('Invalid approval status');
    }

    const visitorApproval = this.dataSource
      .getRepository(VisitorApproval)
      .create({
        id: randomUUID(),
        organization_id: targetOrganizationId,
        visitor_visit_id: createVisitorApprovalDto.visitor_visit_id,
        approval_status: createVisitorApprovalDto.approval_status as
          'PENDING' | 'APPROVED' | 'REJECTED',
        approver_id: createVisitorApprovalDto.approver_id,
        approved_at: createVisitorApprovalDto.approved_at
          ? new Date(createVisitorApprovalDto.approved_at)
          : undefined,
        rejected_at: createVisitorApprovalDto.rejected_at
          ? new Date(createVisitorApprovalDto.rejected_at)
          : undefined,
      } as Partial<VisitorApproval>);

    await this.dataSource.getRepository(VisitorApproval).save(visitorApproval);
    this.live?.publish(
      {
        id: visitorApproval.visitor_visit_id,
        organization_id: visitorApproval.organization_id,
        updatedAt: visitorApproval.updatedAt,
      },
      'visit.approval_changed',
    );
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (visitorApproval as any).organization_id,
      }),
      action: AuditAction.CREATE,
      entity_type: AuditEntityType.VISITOR_APPROVAL,
      entity_id: (visitorApproval as any).id ?? null,
      old_values: null,
      new_values: toSnapshot(visitorApproval),
      ...extractRequestMeta(undefined),
    } as never);
    return visitorApproval;
  }

  async findAll(passedOrgContext?: any) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    const query = this.dataSource
      .getRepository(VisitorApproval)
      .createQueryBuilder('visitor_approval');

    const organizationId = orgContext.isSuperAdmin
      ? orgContext.targetOrganizationId
      : orgContext.organization_id;
    if (!organizationId) throw new ForbiddenException('Organization context is required');
    query.where('visitor_approval.organization_id = :orgId', { orgId: organizationId });

    return query.getMany();
  }

  async findOne(id: string, passedOrgContext?: any) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    const visitorApproval = await this.dataSource
      .getRepository(VisitorApproval)
      .findOneBy({
        id,
        organization_id:
          orgContext.isSuperAdmin && orgContext.targetOrganizationId
            ? orgContext.targetOrganizationId
            : orgContext.organization_id,
      });

    if (!visitorApproval) {
      throw new ForbiddenException(
        'Visitor approval not found or access denied',
      );
    }
    return visitorApproval;
  }

  async update(
    id: string,
    updateVisitorApprovalDto: {
      approval_status?: string;
      approved_at?: string;
      rejected_at?: string;
      organization_id?: string;
    },
    passedOrgContext?: any,
  ) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    const visitorApproval = await this.dataSource
      .getRepository(VisitorApproval)
      .findOneBy({
        id,
        organization_id:
          orgContext.isSuperAdmin && orgContext.targetOrganizationId
            ? orgContext.targetOrganizationId
            : orgContext.organization_id,
      });

    if (!visitorApproval) {
      throw new ForbiddenException(
        'Visitor approval not found or access denied',
      );
    }

    if (!orgContext.isSuperAdmin) {
      if (visitorApproval.organization_id !== orgContext.organization_id) {
        throw new ForbiddenException(
          'You can only update visitor approvals in your organization',
        );
      }
    }

    const oldValues = toSnapshot(visitorApproval);
    if (updateVisitorApprovalDto.approval_status) {
      const validStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
      if (!validStatuses.includes(updateVisitorApprovalDto.approval_status)) {
        throw new ForbiddenException('Invalid approval status');
      }
      visitorApproval.approval_status =
        updateVisitorApprovalDto.approval_status as
          'PENDING' | 'APPROVED' | 'REJECTED';
    }
    if (updateVisitorApprovalDto.approved_at !== undefined) {
      visitorApproval.approved_at = updateVisitorApprovalDto.approved_at
        ? new Date(updateVisitorApprovalDto.approved_at)
        : null;
    }
    if (updateVisitorApprovalDto.rejected_at !== undefined) {
      visitorApproval.rejected_at = updateVisitorApprovalDto.rejected_at
        ? new Date(updateVisitorApprovalDto.rejected_at)
        : null;
    }

    await this.dataSource.getRepository(VisitorApproval).save(visitorApproval);
    this.live?.publish(
      {
        id: visitorApproval.visitor_visit_id,
        organization_id: visitorApproval.organization_id,
        updatedAt: visitorApproval.updatedAt,
      },
      'visit.approval_changed',
    );
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (visitorApproval as any).organization_id,
      }),
      action: AuditAction.UPDATE,
      entity_type: AuditEntityType.VISITOR_APPROVAL,
      entity_id: (visitorApproval as any).id ?? null,
      old_values: oldValues,
      new_values: toSnapshot(visitorApproval),
      ...extractRequestMeta(undefined),
    } as never);
    return visitorApproval;
  }

  async remove(id: string, passedOrgContext?: any) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    const visitorApproval = await this.dataSource
      .getRepository(VisitorApproval)
      .findOneBy({
        id,
        organization_id:
          orgContext.isSuperAdmin && orgContext.targetOrganizationId
            ? orgContext.targetOrganizationId
            : orgContext.organization_id,
      });

    if (!visitorApproval) {
      throw new ForbiddenException(
        'Visitor approval not found or access denied',
      );
    }

    if (!orgContext.isSuperAdmin) {
      if (visitorApproval.organization_id !== orgContext.organization_id) {
        throw new ForbiddenException(
          'You can only reject visitor approvals in your organization',
        );
      }
    }

    const oldValues = toSnapshot(visitorApproval);
    // Soft delete by marking as rejected
    visitorApproval.approval_status = 'REJECTED' as const;
    visitorApproval.rejected_at = new Date();
    await this.dataSource.getRepository(VisitorApproval).save(visitorApproval);
    this.live?.publish(
      {
        id: visitorApproval.visitor_visit_id,
        organization_id: visitorApproval.organization_id,
        updatedAt: visitorApproval.updatedAt,
      },
      'visit.approval_changed',
    );
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (visitorApproval as any).organization_id,
      }),
      action: AuditAction.REJECT,
      entity_type: AuditEntityType.VISITOR_APPROVAL,
      entity_id: (visitorApproval as any).id ?? null,
      old_values: oldValues,
      new_values: null,
      ...extractRequestMeta(undefined),
    } as never);
    return visitorApproval;
  }
}
