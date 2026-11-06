import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/audit.enums';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { DataSource, EntityManager, IsNull, In } from 'typeorm';
import { randomUUID } from 'crypto';
import { basename, extname } from 'path';
import { Notice } from '../database/entities/notice.entity';
import { FileMetadata } from '../database/entities/file-metadata.entity';
import { UserRole } from '../database/entities/user-role.entity';
import { Organization } from '../database/entities/organization.entity';
import { AuthorizationService } from '../authorization/authorization.service';
import {
  resolveAuditContext,
  type AuditOrganizationContextLike,
} from '../audit/audit-context';
import {
  STORAGE_PROVIDER,
  type IStorageProvider,
} from '../files/interfaces/IStorageProvider.interface';
import { UpdateNoticeDto, ScheduleNoticeDto, NoticeStatus } from './dto';
import {
  NOTICE_ATTACHMENT_BYTES,
  NOTICE_ATTACHMENT_LIMIT,
  NOTICE_ATTACHMENT_MIMES,
  NoticePriority,
  noticeDates,
} from './notice-policy';

export interface NoticeUpload {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}
export function validateNoticeUpload(file?: NoticeUpload): NoticeUpload {
  if (
    !file?.buffer?.length ||
    file.buffer.length > NOTICE_ATTACHMENT_BYTES ||
    !NOTICE_ATTACHMENT_MIMES.has(file.mimetype)
  )
    throw new BadRequestException(
      'Attach a PDF, JPG, PNG or WebP file up to 2 MB',
    );
  const extension = extname(file.originalname).toLowerCase();
  const allowed: Record<string, string[]> = {
    'application/pdf': ['.pdf'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/webp': ['.webp'],
  };
  const b = file.buffer;
  const signatures: Record<string, boolean> = {
    'application/pdf':
      b.subarray(0, 5).toString() === '%PDF-' &&
      b.subarray(-1024).includes(Buffer.from('%%EOF')),
    'image/jpeg':
      b.length >= 4 &&
      b[0] === 255 &&
      b[1] === 216 &&
      b[2] === 255 &&
      b[b.length - 2] === 255 &&
      b[b.length - 1] === 217,
    'image/png':
      b.length >= 24 &&
      b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
      b.subarray(12, 16).toString() === 'IHDR',
    'image/webp':
      b.length >= 16 &&
      b.subarray(0, 4).toString() === 'RIFF' &&
      b.subarray(8, 12).toString() === 'WEBP' &&
      b.readUInt32LE(4) + 8 === b.length,
  };
  if (
    !allowed[file.mimetype]?.includes(extension) ||
    !signatures[file.mimetype]
  )
    throw new BadRequestException(
      'File extension, content and MIME type must match',
    );
  return file;
}

@Injectable()
export class NoticeWorkflowService {
  private readonly logger = new Logger(NoticeWorkflowService.name);
  constructor(
    private readonly source: DataSource,
    private readonly authorization: AuthorizationService,
    @Inject(STORAGE_PROVIDER) private readonly storage: IStorageProvider,
    @Optional() private readonly audit?: AuditService,
  ) {}

  private async auditChange(
    id: string,
    context: AuditOrganizationContextLike,
    userId: string,
    organizationId: string,
    operation: string,
    values: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.audit?.record({
        ...resolveAuditContext({
          orgContext: context,
          actorUserId: userId,
          entityOrganizationId: organizationId,
        }),
        action: AuditAction.UPDATE,
        entity_type: AuditEntityType.NOTICE,
        entity_id: id,
        new_values: { operation, ...values },
      });
    } catch {
      this.logger.warn({ event: 'notice_workflow_audit_unavailable' });
    }
  }

  async access(
    context: AuditOrganizationContextLike,
    userId: string,
    manage: boolean,
  ): Promise<string> {
    const organizationId = context?.isSuperAdmin
      ? context.targetOrganizationId
      : (context?.organizationId ?? context?.organization_id);
    if (!organizationId || !userId)
      throw new ForbiddenException('Organization membership required');
    const repo = this.source.getRepository(UserRole);
    const [membership, platform, organization] = await Promise.all([
      repo.findOne({
        where: { userId, organization_id: organizationId },
        relations: { role: true },
      }),
      repo.findOne({
        where: { userId, organization_id: IsNull() },
        relations: { role: true },
      }),
      this.source
        .getRepository(Organization)
        .findOneBy({ id: organizationId, isActive: true }),
    ]);
    const member =
      platform?.role?.name === 'SUPER_ADMIN' &&
      platform.role.isActive &&
      context.isSuperAdmin
        ? platform
        : membership;
    if (
      !organization ||
      !member?.role?.isActive ||
      (manage && !['SUPER_ADMIN', 'SOCIETY_ADMIN'].includes(member.role.name))
    )
      throw new ForbiddenException('Notice access denied');
    if (
      !(await this.authorization.getRolePermissions(member.roleId)).includes(
        manage ? 'notice:publish' : 'notice:read',
      )
    )
      throw new ForbiddenException('Notice access denied');
    return organizationId;
  }

  private async draft(
    manager: EntityManager,
    id: string,
    organizationId: string,
  ): Promise<Notice> {
    const notice = await manager.getRepository(Notice).findOne({
      where: { id, organization_id: organizationId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!notice) throw new NotFoundException('Notice not found');
    if (notice.status !== 'DRAFT')
      throw new ConflictException(
        'Only drafts can be edited. Cancel a scheduled publication before editing.',
      );
    return notice;
  }

  async update(
    id: string,
    dto: UpdateNoticeDto,
    context: AuditOrganizationContextLike,
    userId: string,
  ): Promise<Notice> {
    const organizationId = await this.access(context, userId, true);
    const saved = await this.source.transaction(async (manager) => {
      const notice = await this.draft(manager, id, organizationId);
      if (dto.status && dto.status !== NoticeStatus.DRAFT)
        throw new BadRequestException('Use the publish or schedule action');
      if (dto.title !== undefined) {
        if (!dto.title.trim())
          throw new BadRequestException('Title is required');
        notice.title = dto.title.trim();
      }
      if (dto.content !== undefined) {
        if (!dto.content.trim())
          throw new BadRequestException('Content is required');
        notice.content = dto.content.trim();
      }
      if (dto.priority !== undefined) notice.priority = dto.priority;
      if (dto.expires_at !== undefined)
        notice.expires_at = noticeDates(dto.expires_at).expiry;
      notice.updated_at = new Date();
      return manager.getRepository(Notice).save(notice);
    });
    await this.auditChange(
      id,
      context,
      userId,
      organizationId,
      'DRAFT_UPDATE',
      { priority: saved.priority },
    );
    return saved;
  }

  async schedule(
    id: string,
    dto: ScheduleNoticeDto,
    context: AuditOrganizationContextLike,
    userId: string,
  ): Promise<Notice> {
    if (process.env.NOTICE_SCHEDULER_ENABLED !== 'true')
      throw new ConflictException(
        'Scheduled publishing is unavailable. Contact your administrator.',
      );
    const organizationId = await this.access(context, userId, true);
    const saved = await this.source.transaction(async (manager) => {
      const notice = await this.draft(manager, id, organizationId);
      if (
        notice.priority === NoticePriority.EMERGENCY &&
        dto.confirmEmergency !== true
      )
        throw new BadRequestException(
          'Confirm the mandatory emergency broadcast',
        );
      notice.scheduled_at = noticeDates(
        notice.expires_at,
        dto.publishAt,
      ).publication;
      notice.status = 'SCHEDULED';
      notice.updated_at = new Date();
      return manager.getRepository(Notice).save(notice);
    });
    await this.auditChange(id, context, userId, organizationId, 'SCHEDULE', {
      priority: saved.priority,
      publishAt: saved.scheduled_at?.toISOString(),
      mandatoryEmergencyConfirmed: dto.confirmEmergency === true,
    });
    return saved;
  }

  async cancelSchedule(
    id: string,
    context: AuditOrganizationContextLike,
    userId: string,
  ): Promise<Notice> {
    const organizationId = await this.access(context, userId, true);
    const saved = await this.source.transaction(async (manager) => {
      const repo = manager.getRepository(Notice);
      const notice = await repo.findOne({
        where: { id, organization_id: organizationId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!notice || notice.status !== 'SCHEDULED')
        throw new ConflictException('Notice is no longer scheduled');
      notice.status = 'DRAFT';
      notice.scheduled_at = null;
      notice.updated_at = new Date();
      return repo.save(notice);
    });
    await this.auditChange(
      id,
      context,
      userId,
      organizationId,
      'CANCEL_SCHEDULE',
      { status: saved.status },
    );
    return saved;
  }

  async upload(
    id: string,
    raw: NoticeUpload | undefined,
    context: AuditOrganizationContextLike,
    userId: string,
  ): Promise<FileMetadata> {
    const file = validateNoticeUpload(raw);
    const organizationId = await this.access(context, userId, true);
    let storedKey: string | undefined;
    try {
      const metadata = await this.source.transaction(async (manager) => {
        const notice = await this.draft(manager, id, organizationId);
        if ((notice.attachment_ids ?? []).length >= NOTICE_ATTACHMENT_LIMIT)
          throw new BadRequestException(
            'A notice can have up to five attachments',
          );
        const key = `${randomUUID()}${extname(file.originalname).toLowerCase()}`;
        storedKey = key;
        const stored = await this.storage.store(
          key,
          file.buffer,
          file.mimetype,
        );
        if (stored.key !== key) throw new Error('Unexpected storage key');
        const repo = manager.getRepository(FileMetadata);
        const attachment = await repo.save(
          repo.create({
            id: randomUUID(),
            organization_id: organizationId,
            uploaded_by: userId,
            original_filename:
              Array.from(basename(file.originalname.replace(/\\/g, '/')))
                .filter(
                  (character) =>
                    character.charCodeAt(0) >= 32 &&
                    character.charCodeAt(0) !== 127,
                )
                .join('')
                .slice(0, 200) || 'attachment',
            stored_key: key,
            mime_type: file.mimetype,
            size_bytes: file.buffer.length,
            storage_provider: stored.provider,
            is_active: true,
            purpose: 'DOCUMENT',
            document_scope: 'NOTICE',
            category: 'Notice Attachment',
            status: 'ACTIVE',
            created_at: new Date(),
          }),
        );
        notice.attachment_ids = [
          ...(notice.attachment_ids ?? []),
          attachment.id,
        ];
        notice.updated_at = new Date();
        await manager.getRepository(Notice).save(notice);
        return attachment;
      });
      await this.auditChange(
        id,
        context,
        userId,
        organizationId,
        'ATTACHMENT_ADD',
        { fileId: metadata.id },
      );
      return metadata;
    } catch (error: unknown) {
      if (storedKey) {
        try {
          const committed = await this.source
            .getRepository(FileMetadata)
            .findOneBy({
              stored_key: storedKey,
              organization_id: organizationId,
            });
          if (!committed) await this.storage.delete(storedKey);
        } catch {
          this.logger.warn({ event: 'notice_attachment_cleanup_required' });
        }
      }
      throw error;
    }
  }

  async attachments(
    id: string,
    context: AuditOrganizationContextLike,
    userId: string,
  ): Promise<
    Array<
      Pick<
        FileMetadata,
        'id' | 'original_filename' | 'mime_type' | 'size_bytes'
      >
    >
  > {
    const notice = await this.readable(id, context, userId);
    if (!(notice.attachment_ids ?? []).length) return [];
    const rows = await this.source.getRepository(FileMetadata).findBy({
      id: In(notice.attachment_ids),
      organization_id: notice.organization_id,
      document_scope: 'NOTICE',
      is_active: true,
    });
    return rows
      .filter((file) => notice.attachment_ids.includes(file.id))
      .map(({ id: fileId, original_filename, mime_type, size_bytes }) => ({
        id: fileId,
        original_filename,
        mime_type,
        size_bytes,
      }));
  }

  private async readable(
    id: string,
    context: AuditOrganizationContextLike,
    userId: string,
  ): Promise<Notice> {
    const organizationId = await this.access(context, userId, false);
    const notice = await this.source
      .getRepository(Notice)
      .findOneBy({ id, organization_id: organizationId });
    if (!notice) throw new NotFoundException('Notice not found');
    if (
      notice.status !== 'PUBLISHED' ||
      !notice.published_at ||
      notice.published_at > new Date() ||
      notice.expires_at <= new Date()
    )
      await this.access(context, userId, true);
    return notice;
  }

  async download(
    id: string,
    fileId: string,
    context: AuditOrganizationContextLike,
    userId: string,
  ): Promise<{ metadata: FileMetadata; buffer: Buffer }> {
    const notice = await this.readable(id, context, userId);
    if (!(notice.attachment_ids ?? []).includes(fileId))
      throw new NotFoundException('Attachment not found');
    const metadata = await this.source.getRepository(FileMetadata).findOneBy({
      id: fileId,
      organization_id: notice.organization_id,
      document_scope: 'NOTICE',
      is_active: true,
    });
    if (!metadata) throw new NotFoundException('Attachment not found');
    return {
      metadata,
      buffer: await this.storage.retrieve(metadata.stored_key),
    };
  }

  async removeAttachment(
    id: string,
    fileId: string,
    context: AuditOrganizationContextLike,
    userId: string,
  ): Promise<void> {
    const organizationId = await this.access(context, userId, true);
    const key = await this.source.transaction(async (manager) => {
      const notice = await this.draft(manager, id, organizationId);
      if (!(notice.attachment_ids ?? []).includes(fileId))
        throw new NotFoundException('Attachment not found');
      const file = await manager.getRepository(FileMetadata).findOneBy({
        id: fileId,
        organization_id: organizationId,
        document_scope: 'NOTICE',
        is_active: true,
      });
      if (!file) throw new NotFoundException('Attachment not found');
      notice.attachment_ids = notice.attachment_ids.filter(
        (value) => value !== fileId,
      );
      await manager.getRepository(Notice).save(notice);
      file.is_active = false;
      await manager.getRepository(FileMetadata).save(file);
      return file.stored_key;
    });
    await this.auditChange(
      id,
      context,
      userId,
      organizationId,
      'ATTACHMENT_REMOVE',
      { fileId },
    );
    try {
      await this.storage.delete(key);
    } catch {
      this.logger.warn({ event: 'notice_attachment_cleanup_required' });
    }
  }
}
