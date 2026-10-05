import { Injectable, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { VisitorVisit } from '../database/entities/visitor-visit.entity';
import { Visitor } from '../database/entities/visitor.entity';
import { OrganizationContextService } from '../organization/organization-context.service';
import { Request } from 'express';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/audit.enums';
import { AuditCallContext, extractRequestMeta, recordAudit, resolveAuditContext, toSnapshot } from '../audit/audit-context';

@Injectable()
export class VisitorVisitService {
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

  async createVisitorVisit(createVisitorVisitDto: {
    organization_id: string;
    visitor_id: string;
    visit_status: string;
    visit_purpose?: string;
    expected_entry_time?: Date;
  }) {
    const orgContext =
      (await this.organizationContextService.getCurrentOrganization(
        {} as any,
      )) as any;

    // Validate visitor belongs to same organization
    const visitorRepository = this.dataSource.getRepository(Visitor);
    const visitor = await visitorRepository.findOneBy({
      id: createVisitorVisitDto.visitor_id,
      organization_id: createVisitorVisitDto.organization_id,
    });

    if (!visitor) {
      throw new ForbiddenException('Visitor not found or access denied');
    }

    // Validate visit status
    const validStatuses = [
      'PENDING',
      'CONFIRMED',
      'COMPLETED',
      'CANCELLED',
      'EXPIRED',
    ];
    if (!validStatuses.includes(createVisitorVisitDto.visit_status)) {
      throw new ForbiddenException('Invalid visit status');
    }

    const expectedEntryTime = createVisitorVisitDto.expected_entry_time
      ? new Date(createVisitorVisitDto.expected_entry_time)
      : undefined;

    const visitorVisit = this.dataSource.getRepository(VisitorVisit).create({
      organization_id: createVisitorVisitDto.organization_id,
      visitor_id: createVisitorVisitDto.visitor_id,
      visit_status: createVisitorVisitDto.visit_status as
        'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED',
      visit_purpose: createVisitorVisitDto.visit_purpose,
      expected_entry_time: expectedEntryTime,
    } as Partial<VisitorVisit>);

    await this.dataSource.getRepository(VisitorVisit).save(visitorVisit);
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (visitorVisit as any).organization_id,
      }),
      action: AuditAction.CREATE,
      entity_type: AuditEntityType.VISITOR_VISIT,
      entity_id: (visitorVisit as any).id ?? null,
      old_values: null,
      new_values: toSnapshot(visitorVisit),
      ...extractRequestMeta(undefined),
    } as never);
    return visitorVisit;
  }

  async findAll() {
    const orgContext =
      (await this.organizationContextService.getCurrentOrganization(
        {} as any,
      )) as any;

    const query = this.dataSource
      .getRepository(VisitorVisit)
      .createQueryBuilder('visitor_visit');

    if (!orgContext.isSuperAdmin && orgContext.organization_id) {
      query.where('visitor_visit.organization_id = :orgId', {
        orgId: orgContext.organization_id,
      });
    }

    return query.getMany();
  }

  async findOne(id: string) {
    const orgContext =
      (await this.organizationContextService.getCurrentOrganization(
        {} as any,
      )) as any;

    const visitorVisit = await this.dataSource
      .getRepository(VisitorVisit)
      .findOneBy({
        id,
        organization_id:
          orgContext.isSuperAdmin && orgContext.targetOrganizationId
            ? orgContext.targetOrganizationId
            : orgContext.organization_id,
      });

    if (!visitorVisit) {
      throw new ForbiddenException('Visitor visit not found or access denied');
    }
    return visitorVisit;
  }

  async update(
    id: string,
    updateVisitorVisitDto: {
      visit_status?: string;
      visit_purpose?: string;
      expected_entry_time?: Date;
      organization_id?: string;
    },
  ) {
    const orgContext =
      (await this.organizationContextService.getCurrentOrganization(
        {} as any,
      )) as any;

    const visitorVisit = await this.dataSource
      .getRepository(VisitorVisit)
      .findOneBy({
        id,
        organization_id:
          orgContext.isSuperAdmin && orgContext.targetOrganizationId
            ? orgContext.targetOrganizationId
            : orgContext.organization_id,
      });

    if (!visitorVisit) {
      throw new ForbiddenException('Visitor visit not found or access denied');
    }

    if (!orgContext.isSuperAdmin) {
      if (visitorVisit.organization_id !== orgContext.organization_id) {
        throw new ForbiddenException(
          'You can only update visitor visits in your organization',
        );
      }
    }

    const oldValues = toSnapshot(visitorVisit);
    if (updateVisitorVisitDto.visit_status) {
      const validStatuses = [
        'PENDING',
        'CONFIRMED',
        'COMPLETED',
        'CANCELLED',
        'EXPIRED',
      ];
      if (!validStatuses.includes(updateVisitorVisitDto.visit_status)) {
        throw new ForbiddenException('Invalid visit status');
      }
      visitorVisit.visit_status = updateVisitorVisitDto.visit_status as
        'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
    }
    if (updateVisitorVisitDto.visit_purpose) {
      visitorVisit.visit_purpose = updateVisitorVisitDto.visit_purpose;
    }
    if (updateVisitorVisitDto.expected_entry_time) {
      visitorVisit.expected_entry_time =
        updateVisitorVisitDto.expected_entry_time
          ? new Date(updateVisitorVisitDto.expected_entry_time)
          : null;
    }

    await this.dataSource.getRepository(VisitorVisit).save(visitorVisit);
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (visitorVisit as any).organization_id,
      }),
      action: AuditAction.UPDATE,
      entity_type: AuditEntityType.VISITOR_VISIT,
      entity_id: (visitorVisit as any).id ?? null,
      old_values: oldValues,
      new_values: toSnapshot(visitorVisit),
      ...extractRequestMeta(undefined),
    } as never);
    return visitorVisit;
  }

  async remove(id: string) {
    const orgContext =
      (await this.organizationContextService.getCurrentOrganization(
        {} as any,
      )) as any;

    const visitorVisit = await this.dataSource
      .getRepository(VisitorVisit)
      .findOneBy({
        id,
        organization_id:
          orgContext.isSuperAdmin && orgContext.targetOrganizationId
            ? orgContext.targetOrganizationId
            : orgContext.organization_id,
      });

    if (!visitorVisit) {
      throw new ForbiddenException('Visitor visit not found or access denied');
    }

    if (!orgContext.isSuperAdmin) {
      if (visitorVisit.organization_id !== orgContext.organization_id) {
        throw new ForbiddenException(
          'You can only cancel visitor visits in your organization',
        );
      }
    }

    const oldValues = toSnapshot(visitorVisit);
    visitorVisit.visit_status = 'CANCELLED' as const;
    await this.dataSource.getRepository(VisitorVisit).save(visitorVisit);
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (visitorVisit as any).organization_id,
      }),
      action: AuditAction.CANCEL,
      entity_type: AuditEntityType.VISITOR_VISIT,
      entity_id: (visitorVisit as any).id ?? null,
      old_values: oldValues,
      new_values: null,
      ...extractRequestMeta(undefined),
    } as never);
    return visitorVisit;
  }
}
