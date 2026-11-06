import { CollectionPageDto, NoticePageDto } from '../common/pagination.dto';
import { NoticePriority, noticeDates } from './notice-policy';
import { NoticeDeliveryAdmission } from './notice-delivery-admission';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { BusinessNotificationEvents } from '../notifications/delivery/business-notification-events';
import { NotificationCategory } from '../notifications/notification-preferences.policy';
import { Injectable, Optional, ForbiddenException } from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';
import { randomUUID } from 'crypto';
import { Notification } from '../database/entities/notification.entity';
import { Role } from '../database/entities/role.entity';
import type { FindOptionsWhere } from 'typeorm';
import { UserRole } from '../database/entities/user-role.entity';
import { Notice } from '../database/entities/notice.entity';
import { CreateNoticeDto } from './dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/audit.enums';
import {
  AuditCallContext,
  AuditOrganizationContextLike,
  extractRequestMeta,
  recordAudit,
  resolveAuditContext,
  toSnapshot,
} from '../audit/audit-context';

@Injectable()
export class NoticeService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    @Optional()
    private readonly notificationEvents?: BusinessNotificationEvents,
    @Optional() private readonly admission?: NoticeDeliveryAdmission,
  ) {}

  private buildAuditOptions(
    passed?: AuditCallContext,
    entityOrganizationId?: string | null,
    actorUserId?: string | null,
  ): AuditCallContext {
    return {
      orgContext: passed?.orgContext ?? null,
      actorUserId: passed?.actorUserId ?? actorUserId ?? null,
      entityOrganizationId:
        passed?.entityOrganizationId ?? entityOrganizationId ?? null,
      request: passed?.request,
    };
  }

  private emitAudit(
    action: AuditAction,
    entityType: AuditEntityType,
    entityId: string | null,
    oldValues: Record<string, unknown> | null,
    newValues: Record<string, unknown> | null,
    options?: AuditCallContext,
  ): void {
    const opts = this.buildAuditOptions(
      options,
      (typeof newValues?.organization_id === 'string'
        ? newValues.organization_id
        : null) ??
        (typeof oldValues?.organization_id === 'string'
          ? oldValues.organization_id
          : null) ??
        options?.entityOrganizationId ??
        null,
      options?.actorUserId ?? null,
    );
    const ctx = resolveAuditContext({
      orgContext: opts.orgContext,
      actorUserId: opts.actorUserId ?? undefined,
      entityOrganizationId: opts.entityOrganizationId ?? undefined,
    });
    const meta = extractRequestMeta(opts.request);
    void recordAudit(this.auditService, {
      ...ctx,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_values: oldValues,
      new_values: newValues,
      ...meta,
    } as never);
  }

  async create(
    createDto: CreateNoticeDto,
    authenticatedUserId: string,
    orgContext: AuditOrganizationContextLike,
  ): Promise<Notice> {
    // organization_id is derived from orgContext
    const orgId =
      orgContext?.targetOrganizationId ??
      orgContext?.organizationId ??
      orgContext?.organization_id;
    if (!orgId) {
      throw new ForbiddenException('Organization context is required');
    }

    const notice: Notice = this.dataSource.getRepository(Notice).create({
      id: randomUUID(),
      organization_id: orgId,
      title: createDto.title,
      content: createDto.content,
      status: 'DRAFT',
      published_at: null,
      priority: createDto.priority ?? NoticePriority.NORMAL,
      scheduled_at: null,
      attachment_ids: [],
      expires_at: noticeDates(createDto.expires_at ?? new Date(Date.now() + 30 * 86400000)).expiry,
      created_by: authenticatedUserId,
      created_at: new Date(),
      updated_at: new Date(),
    });
    const saved = await this.dataSource.getRepository(Notice).save(notice);
    await recordAudit(this.auditService, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: saved.organization_id,
      }),
      action: AuditAction.CREATE,
      entity_type: AuditEntityType.NOTICE,
      entity_id: saved.id ?? null,
      old_values: null,
      new_values: toSnapshot(saved),
      ...extractRequestMeta(undefined),
    } as never);
    return saved;
  }

  private async shouldRestrictToPublished(
    orgContext: AuditOrganizationContextLike,
    userId?: string,
    orgId?: string,
  ): Promise<boolean> {
    if (!userId || orgContext?.isSuperAdmin) {
      return false;
    }

    if (!orgId) {
      return true;
    }

    const userRoleRepository =
      this.dataSource.getRepository<UserRole>('UserRole');
    const roleRepository = this.dataSource.getRepository<Role>('Role');

    // Normal organization user: membership must be in orgId
    const userRole = await userRoleRepository.findOne({
      where: { userId, organization_id: orgId },
    });

    if (userRole) {
      const role = await roleRepository.findOne({
        where: { id: userRole.roleId },
      });
      if (role && (role.name === 'RESIDENT' || role.name === 'GUARD')) {
        return true;
      }
      return false;
    }

    // Check platform-scoped SUPER_ADMIN if orgContext.isSuperAdmin was not provided
    const superRole = await userRoleRepository.findOne({
      where: { userId, organization_id: IsNull() },
    });
    if (superRole) {
      const role = await roleRepository.findOne({
        where: { id: superRole.roleId },
      });
      if (role && role.name === 'SUPER_ADMIN') {
        return false;
      }
    }

    return true;
  }

  async findAll(
    orgContext: AuditOrganizationContextLike,
    userId?: string,
  ): Promise<Notice[]> {
    const orgId =
      orgContext?.targetOrganizationId ??
      orgContext?.organizationId ??
      orgContext?.organization_id;
    if (!orgId) {
      throw new ForbiddenException('Organization context is required');
    }

    const where: FindOptionsWhere<Notice> = { organization_id: orgId };

    if (await this.shouldRestrictToPublished(orgContext, userId, orgId)) {
      where.status = 'PUBLISHED';
    }

    return this.dataSource
      .getRepository(Notice)
      .find({ where, order: { created_at: 'DESC' } });
  }

  async findPage(orgContext: AuditOrganizationContextLike, userId: string, query: NoticePageDto) {
    const orgId = orgContext?.targetOrganizationId ?? orgContext?.organizationId ?? orgContext?.organization_id;
    if (!orgId) throw new ForbiddenException('Organization context is required');
    const where: FindOptionsWhere<Notice> = { organization_id: orgId };
    if (await this.shouldRestrictToPublished(orgContext, userId, orgId)) where.status = 'PUBLISHED';
    if (query.recordId) where.id = query.recordId;
    if (query.priority && query.priority !== 'all') where.priority = query.priority as NoticePriority;
    const { page, limit } = query;
    const [items, total] = await this.dataSource.getRepository(Notice).findAndCount({
      where, order: { created_at: 'DESC', id: 'DESC' }, skip: (page - 1) * limit, take: limit,
    });
    return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  async findOne(
    id: string,
    orgContext: AuditOrganizationContextLike,
    userId?: string,
  ): Promise<Notice | null> {
    const orgId =
      orgContext?.targetOrganizationId ??
      orgContext?.organizationId ??
      orgContext?.organization_id;
    if (!orgId) {
      throw new ForbiddenException('Organization context is required');
    }

    const where: FindOptionsWhere<Notice> = { id, organization_id: orgId };

    if (await this.shouldRestrictToPublished(orgContext, userId, orgId)) {
      where.status = 'PUBLISHED';
    }

    return this.dataSource.getRepository(Notice).findOne({ where });
  }

  async publish(
    id: string,
    orgContext: AuditOrganizationContextLike,
    confirmEmergency = false,
  ): Promise<Notice | null> {
    const orgId = orgContext.isSuperAdmin
      ? orgContext.targetOrganizationId
      : orgContext.organizationId ?? orgContext.organization_id;
    if (!orgId) throw new ForbiddenException('Organization context required');
    const { saved, oldValues } = await this.dataSource.transaction(
      async (manager) => {
        const repo = manager.getRepository(Notice);
        const notice = await repo.findOne({
          where: { id, organization_id: orgId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!notice || !['DRAFT', 'SCHEDULED'].includes(notice.status))
          throw new ForbiddenException(
            'Only an existing draft can be published',
          );
        if (notice.priority === NoticePriority.EMERGENCY && !confirmEmergency) throw new BadRequestException('Confirm the mandatory emergency broadcast');
        if (notice.status === 'SCHEDULED' && (!notice.scheduled_at || notice.scheduled_at > new Date())) throw new ConflictException('Scheduled publication is not due');
        if (notice.expires_at <= new Date())
          throw new ForbiddenException('Notice has expired');
        const oldValues = toSnapshot(notice);
        notice.status = 'PUBLISHED';
        notice.scheduled_at = null;
        notice.published_at = new Date();
        notice.updated_at = new Date();
        const result = await repo.save(notice);
        const recipients = await manager
          .getRepository(UserRole)
          .createQueryBuilder('membership')
          .innerJoin('membership.role', 'role')
          .where('membership.organization_id = :orgId', { orgId })
          .andWhere('role.isActive = true')
          .andWhere('role.name = :role', { role: 'RESIDENT' })
          .getMany();
        for (let offset = 0; offset < recipients.length; offset += 200) {
          await manager.getRepository(Notification).save(
            recipients.slice(offset, offset + 200).map((member) => ({
              id: randomUUID(),
              organization_id: orgId,
              recipient_user_id: member.userId,
              type: notice.priority === NoticePriority.EMERGENCY ? 'EMERGENCY' : 'GENERAL',
              title: notice.title,
              body: notice.content,
              data: {
                noticeId: notice.id,
                priority: notice.priority ?? NoticePriority.NORMAL,
                expiresAt: notice.expires_at.toISOString(),
              },
              is_read: false,
              read_at: null,
              created_at: new Date(),
              updated_at: new Date(),
            })),
          );
        }
        if (this.admission) await this.admission.enqueue(manager, notice, recipients);
        else for (const member of recipients) {
          await this.notificationEvents?.user(
            manager,
            orgId,
            member.userId,
            NotificationCategory.NOTICE,
            notice.id,
            `notice:${notice.id}:published`,
          );
        }
        return { saved: result, oldValues };
      },
    );
    await recordAudit(this.auditService, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: saved.organization_id,
      }),
      action: AuditAction.PUBLISH,
      entity_type: AuditEntityType.NOTICE,
      entity_id: saved.id ?? null,
      old_values: oldValues,
      new_values: toSnapshot(saved),
      ...extractRequestMeta(undefined),
    } as never);
    return saved;
  }

  async expire(
    id: string,
    orgContext: AuditOrganizationContextLike,
  ): Promise<Notice | null> {
    const notice = await this.findOne(id, orgContext);
    if (!notice) return null;

    // Only allow PUBLISHED -> ARCHIVED transition
    if (notice.status !== 'PUBLISHED') {
      throw new ForbiddenException(
        `Invalid transition from ${notice.status} to ARCHIVED`,
      );
    }

    const oldValues = toSnapshot(notice);
    notice.status = 'ARCHIVED';
    notice.updated_at = new Date();
    const saved = await this.dataSource.getRepository(Notice).save(notice);
    await recordAudit(this.auditService, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: saved.organization_id,
      }),
      action: AuditAction.EXPIRE,
      entity_type: AuditEntityType.NOTICE,
      entity_id: saved.id ?? null,
      old_values: oldValues,
      new_values: toSnapshot(saved),
      ...extractRequestMeta(undefined),
    } as never);
    return saved;
  }

  async archive(
    id: string,
    orgContext: AuditOrganizationContextLike,
  ): Promise<Notice | null> {
    const notice = await this.findOne(id, orgContext);
    if (!notice) return null;

    // Only allow PUBLISHED -> ARCHIVED transition
    if (notice.status !== 'PUBLISHED') {
      throw new ForbiddenException(
        `Invalid transition from ${notice.status} to ARCHIVED`,
      );
    }

    const oldValues = toSnapshot(notice);
    notice.status = 'ARCHIVED';
    notice.updated_at = new Date();
    const saved = await this.dataSource.getRepository(Notice).save(notice);
    await recordAudit(this.auditService, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: saved.organization_id,
      }),
      action: AuditAction.ARCHIVE,
      entity_type: AuditEntityType.NOTICE,
      entity_id: saved.id ?? null,
      old_values: oldValues,
      new_values: toSnapshot(saved),
      ...extractRequestMeta(undefined),
    } as never);
    return saved;
  }
}
