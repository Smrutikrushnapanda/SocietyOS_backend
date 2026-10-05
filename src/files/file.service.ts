import type { IStorageProvider } from './interfaces/IStorageProvider.interface';
import { Injectable, ForbiddenException, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FileMetadata } from '../database/entities/file-metadata.entity';
import { STORAGE_PROVIDER } from './interfaces/IStorageProvider.interface';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/audit.enums';
import { AuditCallContext, extractRequestMeta, recordAudit, resolveAuditContext, toSnapshot } from '../audit/audit-context';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
]);

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

@Injectable()
export class FileService {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: IStorageProvider,
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

  async upload(
    organizationId: string,
    uploadedBy: string,
    originalFilename: string,
    mimeType: string,
    buffer: Buffer,
    auditOptions?: AuditCallContext,
  ): Promise<FileMetadata> {
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException(`MIME type not allowed: ${mimeType}`);
    }
    if (buffer.length > MAX_SIZE_BYTES) {
      throw new BadRequestException('File exceeds maximum allowed size of 10 MB');
    }

    // Storage key is always server-generated — never derived from user input
    const ext = path.extname(originalFilename).toLowerCase().replace(/[^a-z0-9.]/g, '');
    const storedKey = `${randomUUID()}${ext}`;

    const stored = await this.storageProvider.store(storedKey, buffer, mimeType);

    const repo = this.dataSource.getRepository(FileMetadata);
    const metadata = repo.create({
      id: randomUUID(),
      organization_id: organizationId,
      uploaded_by: uploadedBy,
      original_filename: path.basename(originalFilename),
      stored_key: stored.key,
      mime_type: mimeType,
      size_bytes: stored.sizeBytes,
      storage_provider: stored.provider,
      is_active: true,
      created_at: new Date(),
    });
    const saved = await repo.save(metadata);
    const ctx = resolveAuditContext({
      orgContext:
        auditOptions?.orgContext ?? { userId: uploadedBy, organizationId },
      actorUserId: auditOptions?.actorUserId ?? uploadedBy,
      entityOrganizationId: organizationId,
    });
    await recordAudit(this.auditService as any, {
      ...ctx,
      action: AuditAction.UPLOAD,
      entity_type: AuditEntityType.FILE,
      entity_id: (saved as any).id ?? null,
      old_values: null,
      new_values: toSnapshot(saved),
      ...extractRequestMeta(auditOptions?.request),
    } as never);
    return saved;
  }

  async retrieve(
    id: string,
    organizationId: string,
  ): Promise<{ buffer: Buffer; metadata: FileMetadata }> {
    const metadata = await this.findAuthorized(id, organizationId);
    const buffer = await this.storageProvider.retrieve(metadata.stored_key);
    return { buffer, metadata };
  }

  async remove(
    id: string,
    organizationId: string,
    userId: string,
    auditOptions?: AuditCallContext,
  ): Promise<void> {
    const metadata = await this.findAuthorized(id, organizationId);

    // Only uploader or admin (enforced by permission guard) can delete
    if (metadata.uploaded_by !== userId) {
      throw new ForbiddenException('You can only delete files you uploaded');
    }

    const oldValues = toSnapshot(metadata);
    metadata.is_active = false;
    await this.dataSource.getRepository(FileMetadata).save(metadata);
    const ctx = resolveAuditContext({
      orgContext: auditOptions?.orgContext ?? { userId, organizationId },
      actorUserId: auditOptions?.actorUserId ?? userId,
      entityOrganizationId: organizationId,
    });
    await recordAudit(this.auditService as any, {
      ...ctx,
      action: AuditAction.DELETE,
      entity_type: AuditEntityType.FILE,
      entity_id: (metadata as any).id ?? null,
      old_values: oldValues,
      new_values: null,
      ...extractRequestMeta(auditOptions?.request),
    } as never);
  }

  private async findAuthorized(id: string, organizationId: string): Promise<FileMetadata> {
    const metadata = await this.dataSource
      .getRepository(FileMetadata)
      .findOne({ where: { id, organization_id: organizationId, is_active: true } });

    if (!metadata) {
      throw new NotFoundException('File not found or access denied');
    }
    return metadata;
  }
}
