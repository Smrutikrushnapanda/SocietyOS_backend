import { Injectable, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Visitor } from '../database/entities/visitor.entity';
import { OrganizationContextService } from '../organization/organization-context.service';
import { Request } from 'express';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/audit.enums';
import { AuditCallContext, extractRequestMeta, recordAudit, resolveAuditContext, toSnapshot } from '../audit/audit-context';

@Injectable()
export class VisitorService {
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

  async createVisitor(createVisitorDto: {
    organization_id: string;
    name: string;
    mobile: string;
    active?: boolean;
  }) {
    const orgContext =
      (await this.organizationContextService.getCurrentOrganization(
        {} as any,
      )) as any;

    // Verify organization matches user's organization (for normal users)
    if (
      !orgContext.isSuperAdmin &&
      orgContext.organization_id &&
      createVisitorDto.organization_id !== orgContext.organization_id
    ) {
      throw new ForbiddenException(
        'You can only create visitors in your organization',
      );
    }

    const visitor = this.dataSource.getRepository(Visitor).create({
      id: '00000000-0000-0000-0000-000000000000',
      organization_id: createVisitorDto.organization_id,
      name: createVisitorDto.name,
      mobile: createVisitorDto.mobile,
      active: createVisitorDto.active !== false,
    });

    await this.dataSource.getRepository(Visitor).save(visitor);
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (visitor as any).organization_id,
      }),
      action: AuditAction.CREATE,
      entity_type: AuditEntityType.VISITOR,
      entity_id: (visitor as any).id ?? null,
      old_values: null,
      new_values: toSnapshot(visitor),
      ...extractRequestMeta(undefined),
    } as never);
    return visitor;
  }

  async findAll() {
    const orgContext =
      (await this.organizationContextService.getCurrentOrganization(
        {} as any,
      )) as any;

    const query = this.dataSource
      .getRepository(Visitor)
      .createQueryBuilder('visitor');

    if (!orgContext.isSuperAdmin && orgContext.organization_id) {
      query.where('visitor.organization_id = :orgId', {
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

    const visitor = await this.dataSource.getRepository(Visitor).findOneBy({
      id,
      organization_id:
        orgContext.isSuperAdmin && orgContext.targetOrganizationId
          ? orgContext.targetOrganizationId
          : orgContext.organization_id,
    });

    if (!visitor) {
      throw new ForbiddenException('Visitor not found or access denied');
    }
    return visitor;
  }

  async update(
    id: string,
    updateVisitorDto: {
      name?: string;
      mobile?: string;
      active?: boolean;
    },
  ) {
    const orgContext =
      (await this.organizationContextService.getCurrentOrganization(
        {} as any,
      )) as any;

    const visitor = await this.dataSource.getRepository(Visitor).findOneBy({
      id,
      organization_id:
        orgContext.isSuperAdmin && orgContext.targetOrganizationId
          ? orgContext.targetOrganizationId
          : orgContext.organization_id,
    });

    if (!visitor) {
      throw new ForbiddenException('Visitor not found or access denied');
    }

    if (!orgContext.isSuperAdmin) {
      if (visitor.organization_id !== orgContext.organization_id) {
        throw new ForbiddenException(
          'You can only update visitors in your organization',
        );
      }
    }

    const oldValues = toSnapshot(visitor);
    if (updateVisitorDto.name) {
      visitor.name = updateVisitorDto.name;
    }
    if (updateVisitorDto.mobile) {
      visitor.mobile = updateVisitorDto.mobile;
    }
    if (updateVisitorDto.active !== undefined) {
      visitor.active = updateVisitorDto.active;
    }

    await this.dataSource.getRepository(Visitor).save(visitor);
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (visitor as any).organization_id,
      }),
      action: AuditAction.UPDATE,
      entity_type: AuditEntityType.VISITOR,
      entity_id: (visitor as any).id ?? null,
      old_values: oldValues,
      new_values: toSnapshot(visitor),
      ...extractRequestMeta(undefined),
    } as never);
    return visitor;
  }

  async remove(id: string) {
    const orgContext =
      (await this.organizationContextService.getCurrentOrganization(
        {} as any,
      )) as any;

    const visitor = await this.dataSource.getRepository(Visitor).findOneBy({
      id,
      organization_id:
        orgContext.isSuperAdmin && orgContext.targetOrganizationId
          ? orgContext.targetOrganizationId
          : orgContext.organization_id,
    });

    if (!visitor) {
      throw new ForbiddenException('Visitor not found or access denied');
    }

    if (!orgContext.isSuperAdmin) {
      if (visitor.organization_id !== orgContext.organization_id) {
        throw new ForbiddenException(
          'You can only deactivate visitors in your organization',
        );
      }
    }

    const oldValues = toSnapshot(visitor);
    visitor.active = false;
    await this.dataSource.getRepository(Visitor).save(visitor);
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (visitor as any).organization_id,
      }),
      action: AuditAction.DELETE,
      entity_type: AuditEntityType.VISITOR,
      entity_id: (visitor as any).id ?? null,
      old_values: oldValues,
      new_values: null,
      ...extractRequestMeta(undefined),
    } as never);
    return visitor;
  }
}
