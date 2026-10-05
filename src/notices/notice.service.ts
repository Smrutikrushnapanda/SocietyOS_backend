import { Injectable, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Notice } from '../database/entities/notice.entity';
import { CreateNoticeDto } from './dto';
import { UpdateNoticeDto } from './dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/audit.enums';
import { AuditCallContext, extractRequestMeta, recordAudit, resolveAuditContext, toSnapshot } from '../audit/audit-context';

@Injectable()
export class NoticeService {
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

  async create(createDto: CreateNoticeDto, authenticatedUserId: string, orgContext: any): Promise<Notice> {
    // organization_id is derived from orgContext
    const orgId = orgContext?.organizationId;

    const notice: Notice = this.dataSource
      .getRepository(Notice)
      .create({
        id: createDto.id,
        organization_id: orgId,
        title: createDto.title,
        content: createDto.content,
        status: 'DRAFT',
        published_at: null,
        expires_at: createDto.expires_at,
        created_by: authenticatedUserId,
        created_at: new Date(),
        updated_at: new Date,
      });
    const saved = await this.dataSource.getRepository(Notice).save(notice);
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (saved as any).organization_id,
      }),
      action: AuditAction.CREATE,
      entity_type: AuditEntityType.NOTICE,
      entity_id: (saved as any).id ?? null,
      old_values: null,
      new_values: toSnapshot(saved),
      ...extractRequestMeta(undefined),
    } as never);
    return saved;
  }

  async findAll(orgContext: any): Promise<Notice[]> {
    const orgId = orgContext.organizationId;
    // Residents and guards can only read PUBLISHED notices
    // Society admin can read all notices in their organization
    const where: any = { organization_id: orgId };
    return this.dataSource.getRepository(Notice).find({ where });
  }

  async findOne(id: string, orgContext: any): Promise<Notice | null> {
    const orgId = orgContext.organizationId;
    return this.dataSource.getRepository(Notice).findOne({ where: { id, organization_id: orgId } });
  }

  async publish(id: string, orgContext: any): Promise<Notice | null> {
    const orgId = orgContext.organizationId;
    const notice = await this.findOne(id, orgContext);
    if (!notice) return null;

    // Only allow DRAFT -> PUBLISHED transition
    if (notice.status !== 'DRAFT') {
      throw new ForbiddenException(
        `Invalid transition from ${notice.status} to PUBLISHED`
      );
    }

    const oldValues = toSnapshot(notice);
    notice.status = 'PUBLISHED';
    notice.published_at = new Date();
    notice.updated_at = new Date;
    const saved = await this.dataSource.getRepository(Notice).save(notice);
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (saved as any).organization_id,
      }),
      action: AuditAction.PUBLISH,
      entity_type: AuditEntityType.NOTICE,
      entity_id: (saved as any).id ?? null,
      old_values: oldValues,
      new_values: toSnapshot(saved),
      ...extractRequestMeta(undefined),
    } as never);
    return saved;
  }

  async expire(id: string, orgContext: any): Promise<Notice | null> {
    const orgId = orgContext.organizationId;
    const notice = await this.findOne(id, orgContext);
    if (!notice) return null;

    // Only allow PUBLISHED -> ARCHIVED transition
    if (notice.status !== 'PUBLISHED') {
      throw new ForbiddenException(
        `Invalid transition from ${notice.status} to ARCHIVED`
      );
    }

    const oldValues = toSnapshot(notice);
    notice.status = 'ARCHIVED';
    notice.updated_at = new Date;
    const saved = await this.dataSource.getRepository(Notice).save(notice);
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (saved as any).organization_id,
      }),
      action: AuditAction.EXPIRE,
      entity_type: AuditEntityType.NOTICE,
      entity_id: (saved as any).id ?? null,
      old_values: oldValues,
      new_values: toSnapshot(saved),
      ...extractRequestMeta(undefined),
    } as never);
    return saved;
  }

  async archive(id: string, orgContext: any): Promise<Notice | null> {
    const orgId = orgContext.organizationId;
    const notice = await this.findOne(id, orgContext);
    if (!notice) return null;

    // Only allow PUBLISHED -> ARCHIVED transition
    if (notice.status !== 'PUBLISHED') {
      throw new ForbiddenException(
        `Invalid transition from ${notice.status} to ARCHIVED`
      );
    }

    const oldValues = toSnapshot(notice);
    notice.status = 'ARCHIVED';
    notice.updated_at = new Date;
    const saved = await this.dataSource.getRepository(Notice).save(notice);
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (saved as any).organization_id,
      }),
      action: AuditAction.ARCHIVE,
      entity_type: AuditEntityType.NOTICE,
      entity_id: (saved as any).id ?? null,
      old_values: oldValues,
      new_values: toSnapshot(saved),
      ...extractRequestMeta(undefined),
    } as never);
    return saved;
  }
}