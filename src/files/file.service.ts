import { Flat } from '../database/entities/flat.entity';
import { DocumentFolder } from '../database/entities/document-folder.entity';
import { documentsOnly } from './document-query';
import type { IStorageProvider } from './interfaces/IStorageProvider.interface';
import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FileMetadata } from '../database/entities/file-metadata.entity';
import { Resident } from '../database/entities/resident.entity';
import { STORAGE_PROVIDER } from './interfaces/IStorageProvider.interface';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/audit.enums';
import {
  AuditCallContext,
  extractRequestMeta,
  recordAudit,
  resolveAuditContext,
  toSnapshot,
} from '../audit/audit-context';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.pdf',
  '.txt',
]);

const MIME_EXTENSION_MAP: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
};

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_FILENAME_LENGTH = 255;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class FileService {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: IStorageProvider,
    private readonly auditService: AuditService,
  ) {}

  private validateFileSignature(mimeType: string, buffer: Buffer): void {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('File cannot be empty');
    }

    switch (mimeType) {
      case 'image/jpeg': {
        // JPEG magic bytes: FF D8 FF
        if (
          buffer.length < 3 ||
          buffer[0] !== 0xff ||
          buffer[1] !== 0xd8 ||
          buffer[2] !== 0xff
        ) {
          throw new BadRequestException(
            'Invalid file signature for JPEG image',
          );
        }
        break;
      }
      case 'image/png': {
        // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
        const pngHeader = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
        if (
          buffer.length < pngHeader.length ||
          !pngHeader.every((byte, idx) => buffer[idx] === byte)
        ) {
          throw new BadRequestException('Invalid file signature for PNG image');
        }
        break;
      }
      case 'image/gif': {
        // GIF magic bytes: GIF87a or GIF89a
        if (buffer.length < 6) {
          throw new BadRequestException('Invalid file signature for GIF image');
        }
        const gifHeader = buffer.subarray(0, 6).toString('ascii');
        if (gifHeader !== 'GIF87a' && gifHeader !== 'GIF89a') {
          throw new BadRequestException('Invalid file signature for GIF image');
        }
        break;
      }
      case 'image/webp': {
        // WEBP magic bytes: RIFF....WEBP (RIFF at 0..3 and WEBP at 8..11)
        if (buffer.length < 12) {
          throw new BadRequestException(
            'Invalid file signature for WEBP image',
          );
        }
        const riff = buffer.subarray(0, 4).toString('ascii');
        const webp = buffer.subarray(8, 12).toString('ascii');
        if (riff !== 'RIFF' || webp !== 'WEBP') {
          throw new BadRequestException(
            'Invalid file signature for WEBP image',
          );
        }
        break;
      }
      case 'application/pdf': {
        // PDF magic bytes: %PDF- (0x25 0x50 0x44 0x46)
        if (buffer.length < 5) {
          throw new BadRequestException(
            'Invalid file signature for PDF document',
          );
        }
        const pdfHeader = buffer.subarray(0, 5).toString('ascii');
        if (!pdfHeader.startsWith('%PDF-') && !pdfHeader.startsWith('%PDF')) {
          throw new BadRequestException(
            'Invalid file signature for PDF document',
          );
        }
        break;
      }
      case 'text/plain': {
        // Plain text validation: reject binary control characters (except common formatting like \t, \n, \r)
        // Especially reject null bytes (0x00) and dangerous binary signatures (e.g. MZ, ELF, PK)
        if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
          throw new BadRequestException(
            'Executable files disguised as text are rejected',
          );
        }
        if (
          buffer.length >= 4 &&
          buffer[0] === 0x7f &&
          buffer.subarray(1, 4).toString('ascii') === 'ELF'
        ) {
          throw new BadRequestException(
            'ELF binary files disguised as text are rejected',
          );
        }
        // Check first 4096 bytes for null bytes or unprintable control characters
        const sampleSize = Math.min(buffer.length, 4096);
        for (let i = 0; i < sampleSize; i++) {
          const byte = buffer[i];
          if (byte === 0x00) {
            throw new BadRequestException(
              'Binary files with null bytes are not allowed as text/plain',
            );
          }
          // Allow tab (9), newline (10), carriage return (13), and printable ASCII / UTF-8
          if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) {
            throw new BadRequestException(
              'File contains unprintable control characters and is not valid text/plain',
            );
          }
        }
        break;
      }
      default:
        throw new BadRequestException(`Unsupported MIME type: ${mimeType}`);
    }
  }

  private sanitizeFilename(originalFilename: string): string {
    if (!originalFilename || typeof originalFilename !== 'string') {
      return 'unnamed_file';
    }
    // Strip HTML/XML tags before path extraction so closing tags like </script> are not treated as path separators
    let cleaned = originalFilename.trim().replace(/<[^>]*>/g, '');
    // Normalize Windows backslashes to forward slashes before path extraction
    cleaned = cleaned.replace(/\\/g, '/');
    // Extract base name to defeat directory traversal like ../../../
    let base = path.posix.basename(cleaned);
    // Strip CRLF and control characters to prevent header injection
    base = base.replace(/[\r\n\0]/g, '');
    // Strip any remaining traversal components (.. or / or \)
    base = base.replace(/\.\./g, '');
    // Strip dangerous quotes and delimiters
    base = base.replace(/[<>"'`;]/g, '');
    // Enforce max length
    if (base.length > MAX_FILENAME_LENGTH) {
      const ext = path.extname(base);
      base = base.substring(0, MAX_FILENAME_LENGTH - ext.length) + ext;
    }
    return base || 'unnamed_file';
  }

  private buildAuditOptions(
    passed?: AuditCallContext,
    entityOrganizationId?: string | null,
    actorUserId?: string | null,
  ): AuditCallContext {
    return {
      orgContext: (passed?.orgContext ?? null) as any,
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
      (newValues as any)?.organization_id ??
        (oldValues as any)?.organization_id ??
        options?.entityOrganizationId ??
        null,
      options?.actorUserId ?? null,
    );
    const ctx = resolveAuditContext({
      orgContext: opts.orgContext as any,
      actorUserId: opts.actorUserId ?? undefined,
      entityOrganizationId: opts.entityOrganizationId ?? undefined,
    });
    const meta = extractRequestMeta(opts.request);
    void recordAudit(
      this.auditService as any,
      {
        ...ctx,
        action,
        entity_type: entityType,
        entity_id: entityId,
        old_values: oldValues,
        new_values: newValues,
        ...meta,
      } as never,
    );
  }

  private async validateDocumentLocation(metadata: Pick<FileMetadata, 'organization_id' | 'document_scope' | 'flat_id' | 'building_id' | 'floor_id' | 'folder_id' | 'resident_id'>): Promise<void> {
    metadata.document_scope = metadata.document_scope.toUpperCase();
    if (!['SOCIETY', 'FLAT'].includes(metadata.document_scope)) throw new BadRequestException('Invalid document scope');
    if (metadata.document_scope === 'FLAT' && !metadata.flat_id) throw new BadRequestException('Flat vault documents require a flat');
    if (metadata.flat_id) {
      const flat = await this.dataSource.getRepository(Flat).findOne({ where: { id: metadata.flat_id, organization_id: metadata.organization_id, isActive: true } });
      if (!flat) throw new ForbiddenException('Flat not found or access denied');
      if (metadata.document_scope !== 'FLAT') throw new BadRequestException('Flat documents must use the flat vault scope');
      metadata.building_id = flat.building_id;
      metadata.floor_id = flat.floor_id;
    }
    if (metadata.resident_id) {
      const resident = await this.dataSource.getRepository(Resident).findOne({ where: { id: metadata.resident_id, organization_id: metadata.organization_id } });
      if (!resident) throw new ForbiddenException('Resident not found or access denied');
      if (metadata.flat_id && resident.flat_id !== metadata.flat_id) throw new BadRequestException('Resident document must match the assigned flat');
    }
    if (metadata.folder_id) {
      const folder = await this.dataSource.getRepository(DocumentFolder).findOne({ where: { id: metadata.folder_id, organization_id: metadata.organization_id, is_active: true } });
      if (!folder) throw new ForbiddenException('Folder not found or access denied');
      if (folder.folder_type === 'FLAT' && (metadata.document_scope !== 'FLAT' || folder.flat_id !== metadata.flat_id)) throw new BadRequestException('Document must match the folder flat vault');
    }
  }

  async upload(
    organizationId: string,
    uploadedBy: string,
    originalFilename: string,
    mimeType: string,
    buffer: Buffer,
    auditOptions?: AuditCallContext,
  ): Promise<FileMetadata> {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('File cannot be empty');
    }
    if (buffer.length > MAX_SIZE_BYTES) {
      throw new BadRequestException(
        'File exceeds maximum allowed size of 10 MB',
      );
    }

    if (!mimeType || !ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException(`MIME type not allowed: ${mimeType}`);
    }

    // Extension validation
    const rawExt = path.extname(originalFilename || '').toLowerCase();
    if (!rawExt || !ALLOWED_EXTENSIONS.has(rawExt)) {
      throw new BadRequestException(
        `File extension not allowed: ${rawExt || '(none)'}`,
      );
    }

    // Verify extension matches the declared MIME type
    const validExtensionsForMime = MIME_EXTENSION_MAP[mimeType] || [];
    if (!validExtensionsForMime.includes(rawExt)) {
      throw new BadRequestException(
        `File extension ${rawExt} does not match declared MIME type ${mimeType}`,
      );
    }

    const reservedScope: unknown = auditOptions ? Reflect.get(auditOptions, 'documentScope') : undefined;
    if (typeof reservedScope === 'string' && reservedScope.toUpperCase() === 'NOTICE') throw new BadRequestException('Upload notice attachments through the notice endpoint');

    // Category-specific validation: Profile Photo, Identity Proof, Ownership Proof
    const purpose = (auditOptions as any)?.purpose || 'ATTACHMENT';
    if (!['DOCUMENT', 'PROFILE_PHOTO', 'ATTACHMENT'].includes(purpose)) throw new BadRequestException('Invalid file purpose');
    const category = purpose === 'PROFILE_PHOTO' ? 'Profile Photo' : (auditOptions as any)?.category;
    const isResidentDoc =
      category === 'Profile Photo' ||
      category === 'Identity Proof' ||
      category === 'Ownership Proof';

    if (category === 'Society Amenity Photo') {
      const allowedAmenityPhotoExts = ['.jpg', '.jpeg', '.png', '.webp'];
      const allowedAmenityPhotoMimes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedAmenityPhotoExts.includes(rawExt) || !allowedAmenityPhotoMimes.includes(mimeType)) {
        throw new BadRequestException('Amenity Photo only supports JPG, JPEG, PNG, or WEBP images');
      }
    }

    if (isResidentDoc && buffer.length > 2 * 1024 * 1024) {
      throw new BadRequestException(
        `${category} exceeds maximum allowed size of 2 MB`,
      );
    }

    if (category === 'Profile Photo') {
      const allowedPhotoExts = ['.jpg', '.jpeg', '.png', '.webp'];
      const allowedPhotoMimes = ['image/jpeg', 'image/png', 'image/webp'];
      if (
        !allowedPhotoExts.includes(rawExt) ||
        !allowedPhotoMimes.includes(mimeType)
      ) {
        throw new BadRequestException(
          'Resident Photo only supports JPG, JPEG, PNG, or WEBP images',
        );
      }
    } else if (category === 'Identity Proof') {
      const allowedIdentityExts = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
      const allowedIdentityMimes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf',
      ];
      if (
        !allowedIdentityExts.includes(rawExt) ||
        !allowedIdentityMimes.includes(mimeType)
      ) {
        throw new BadRequestException(
          'Identity Proof only supports JPG, JPEG, PNG, WEBP, or PDF files',
        );
      }
    } else if (category === 'Ownership Proof') {
      const allowedOwnershipExts = [
        '.jpg',
        '.jpeg',
        '.png',
        '.webp',
        '.pdf',
        '.txt',
      ];
      const allowedOwnershipMimes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf',
        'text/plain',
      ];
      if (
        !allowedOwnershipExts.includes(rawExt) ||
        !allowedOwnershipMimes.includes(mimeType)
      ) {
        throw new BadRequestException(
          'Ownership Proof only supports JPG, JPEG, PNG, WEBP, PDF, or TXT files',
        );
      }
    }

    // Magic number / signature validation
    this.validateFileSignature(mimeType, buffer);

    // Sanitize client-supplied filename for safe storage as metadata
    const safeOriginalFilename = this.sanitizeFilename(originalFilename);

    // Storage key is always server-generated UUID — never derived from user input or traversal
    const safeExt = rawExt.replace(/[^a-z0-9.]/g, '');
    const storedKey = `${randomUUID()}${safeExt}`;

    const repo = this.dataSource.getRepository(FileMetadata);
    const metadata = repo.create({
      id: randomUUID(),
      organization_id: organizationId,
      uploaded_by: uploadedBy,
      original_filename: safeOriginalFilename,
      stored_key: storedKey,
      mime_type: mimeType,
      size_bytes: buffer.length,
      storage_provider: 'LOCAL',
      is_active: true,
      document_scope: (auditOptions as any)?.documentScope || 'SOCIETY',
      category: category || 'General',
      purpose,
      building_id: (auditOptions as any)?.buildingId || null,
      floor_id: (auditOptions as any)?.floorId || null,
      flat_id: (auditOptions as any)?.flatId || null,
      resident_id: (auditOptions as any)?.residentId || null,
      status: (auditOptions as any)?.status || 'ACTIVE',
      description: (auditOptions as any)?.description || null,
      folder_id: (auditOptions as any)?.folderId || null,
      created_at: new Date(),
    });
    if (purpose === 'DOCUMENT') await this.validateDocumentLocation(metadata);
    const stored = await this.storageProvider.store(
      storedKey,
      buffer,
      mimeType,
    );

    metadata.stored_key = stored.key;
    metadata.size_bytes = stored.sizeBytes;
    metadata.storage_provider = stored.provider;
    const saved = await repo.save(metadata);
    const ctx = resolveAuditContext({
      orgContext: auditOptions?.orgContext ?? {
        userId: uploadedBy,
        organizationId,
      },
      actorUserId: auditOptions?.actorUserId ?? uploadedBy,
      entityOrganizationId: organizationId,
    });
    await recordAudit(
      this.auditService as any,
      {
        ...ctx,
        action: AuditAction.UPLOAD,
        entity_type: AuditEntityType.FILE,
        entity_id: (saved as any).id ?? null,
        old_values: null,
        new_values: toSnapshot(saved),
        ...extractRequestMeta(auditOptions?.request),
      } as never,
    );
    return saved;
  }

  async list(
    organizationId: string,
    actingUserId: string,
    actingUserRoles: string[] = [],
    query: {
      scope?: string;
      category?: string;
      buildingId?: string;
      floorId?: string;
      flatId?: string | null;
      residentId?: string;
      status?: string;
      search?: string;
      folderId?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: string;
    } = {},
  ): Promise<{
    data: FileMetadata[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const qb = this.dataSource
      .getRepository(FileMetadata)
      .createQueryBuilder('f')
      .where('f.organization_id = :organizationId', { organizationId })
      .andWhere('f.is_active = true');

    documentsOnly(qb, Boolean(query.residentId));
    const isResidentOnly =
      actingUserRoles.includes('RESIDENT') &&
      !actingUserRoles.includes('SOCIETY_ADMIN') &&
      !actingUserRoles.includes('SUPER_ADMIN');

    if (isResidentOnly) {
      const residentRepo = this.dataSource.getRepository(Resident);
      const residents = await residentRepo.find({
        where: { user_id: actingUserId, organization_id: organizationId },
      });
      const allowedFlatIds = residents.map((r) => r.flat_id).filter(Boolean);

      if (allowedFlatIds.length > 0) {
        qb.andWhere(
          "(f.document_scope = 'SOCIETY' OR (f.document_scope = 'FLAT' AND f.flat_id IN (:...allowedFlatIds)))",
          { allowedFlatIds },
        );
      } else {
        qb.andWhere("f.document_scope = 'SOCIETY'");
      }
    }

    if (query.scope && query.scope !== 'all') {
      qb.andWhere('LOWER(f.document_scope) = :scope', {
        scope: query.scope.toLowerCase(),
      });
    }

    if (query.category && query.category !== 'all') {
      qb.andWhere('LOWER(f.category) = :category', {
        category: query.category.toLowerCase(),
      });
    }

    if (query.buildingId && query.buildingId !== 'all') {
      qb.andWhere('f.building_id = :buildingId', {
        buildingId: query.buildingId,
      });
    }

    if (query.floorId && query.floorId !== 'all') {
      qb.andWhere('f.floor_id = :floorId', { floorId: query.floorId });
    }

    if (query.flatId && query.flatId !== 'all') {
      qb.andWhere('f.flat_id = :flatId', { flatId: query.flatId });
    }

    if (query.residentId && query.residentId !== 'all') {
      qb.andWhere('f.resident_id = :residentId', {
        residentId: query.residentId,
      });
    }

    if (query.status && query.status !== 'all') {
      qb.andWhere('LOWER(f.status) = :status', {
        status: query.status.toLowerCase(),
      });
    }

    if (query.search && query.search.trim()) {
      const term = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        "(LOWER(f.original_filename) LIKE :term OR LOWER(COALESCE(f.description, '')) LIKE :term OR LOWER(f.category) LIKE :term)",
        { term },
      );
    }

    // Folder scoping. `root` is an explicit sentinel for "documents not in any
    // folder", so the UI can distinguish it from "no filter applied".
    if (query.folderId === 'root') {
      qb.andWhere('f.folder_id IS NULL');
    } else if (query.folderId && query.folderId !== 'all') {
      qb.andWhere('f.folder_id = :folderId', { folderId: query.folderId });
    }

    const sortColumns: Record<string, string> = {
      name: 'f.original_filename',
      category: 'f.category',
      size: 'f.size_bytes',
      uploaded: 'f.created_at',
      status: 'f.status',
    };
    const sortColumn =
      sortColumns[query.sortBy || 'uploaded'] || sortColumns.uploaded;
    const sortOrder = query.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    qb.orderBy(sortColumn, sortOrder)
      .addOrderBy('f.id', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async getStats(
    organizationId: string,
    actingUserId: string,
    actingUserRoles: string[] = [],
  ): Promise<{
    total: number;
    societyCount: number;
    flatCount: number;
    pendingReviewCount: number;
  }> {
    const qb = this.dataSource
      .getRepository(FileMetadata)
      .createQueryBuilder('f')
      .where('f.organization_id = :organizationId', { organizationId })
      .andWhere('f.is_active = true');

    documentsOnly(qb);
    const isResidentOnly =
      actingUserRoles.includes('RESIDENT') &&
      !actingUserRoles.includes('SOCIETY_ADMIN') &&
      !actingUserRoles.includes('SUPER_ADMIN');

    if (isResidentOnly) {
      const residentRepo = this.dataSource.getRepository(Resident);
      const residents = await residentRepo.find({
        where: { user_id: actingUserId, organization_id: organizationId },
      });
      const allowedFlatIds = residents.map((r) => r.flat_id).filter(Boolean);
      if (allowedFlatIds.length > 0) {
        qb.andWhere(
          "(f.document_scope = 'SOCIETY' OR (f.document_scope = 'FLAT' AND f.flat_id IN (:...allowedFlatIds)))",
          { allowedFlatIds },
        );
      } else {
        qb.andWhere("f.document_scope = 'SOCIETY'");
      }
    }

    const all = await qb.getMany();
    const total = all.length;
    const societyCount = all.filter(
      (d) => d.document_scope?.toUpperCase() === 'SOCIETY',
    ).length;
    const flatCount = all.filter(
      (d) => d.document_scope?.toUpperCase() === 'FLAT',
    ).length;
    const pendingReviewCount = all.filter(
      (d) => d.status?.toUpperCase() === 'PENDING',
    ).length;

    return { total, societyCount, flatCount, pendingReviewCount };
  }

  async updateMetadata(
    id: string,
    organizationId: string,
    userId: string,
    dto: {
      category?: string;
      description?: string;
      status?: string;
      flatId?: string | null;
      residentId?: string;
      buildingId?: string;
      floorId?: string;
      folderId?: string;
    },
    auditOptions?: AuditCallContext,
  ): Promise<FileMetadata> {
    const metadata = await this.findAuthorized(id, organizationId);
    const oldValues = toSnapshot(metadata);

    if (dto.category !== undefined) metadata.category = dto.category;
    if (dto.description !== undefined) metadata.description = dto.description;
    if (dto.status !== undefined) metadata.status = dto.status;
    if (dto.flatId !== undefined) {
      metadata.flat_id = dto.flatId || null;
      metadata.document_scope = dto.flatId ? 'FLAT' : 'SOCIETY';
    }
    if (dto.residentId !== undefined) metadata.resident_id = dto.residentId;
    if (dto.buildingId !== undefined) metadata.building_id = dto.buildingId;
    if (dto.floorId !== undefined) metadata.floor_id = dto.floorId;
    if (dto.folderId !== undefined) metadata.folder_id = dto.folderId;

    if (metadata.purpose === 'DOCUMENT') await this.validateDocumentLocation(metadata);

    const saved = await this.dataSource
      .getRepository(FileMetadata)
      .save(metadata);
    const ctx = resolveAuditContext({
      orgContext: auditOptions?.orgContext ?? { userId, organizationId },
      actorUserId: auditOptions?.actorUserId ?? userId,
      entityOrganizationId: organizationId,
    });
    const auditAction = AuditAction.UPDATE;
    const auditEntity = AuditEntityType.FILE;
    await recordAudit(
      this.auditService as any,
      {
        ...ctx,
        action: auditAction,
        entity_type: auditEntity,
        entity_id: saved.id,
        old_values: oldValues,
        new_values: toSnapshot(saved),
        ...extractRequestMeta(auditOptions?.request),
      } as never,
    );

    return saved;
  }

  async retrieve(
    id: string,
    organizationId: string,
    user?: { id?: string; roles?: string[] },
  ): Promise<{ buffer: Buffer; metadata: FileMetadata }> {
    const metadata = await this.findAuthorized(id, organizationId);

    if (metadata.purpose === 'PROFILE_PHOTO' || metadata.category === 'Profile Photo') {
      const admin = user?.roles?.some(role => ['SOCIETY_ADMIN', 'SUPER_ADMIN'].includes(role));
      if (!admin && metadata.uploaded_by !== user?.id) {
        const owner = user?.id ? await this.dataSource.getRepository(Resident).findOne({ where: {
          organization_id: organizationId, user_id: user.id, profile_photo_file_id: metadata.id,
        } }) : null;
        if (!owner) throw new ForbiddenException('Profile photo access denied');
      }
    }
    // Private flat vault protection
    if (
      metadata.document_scope?.toUpperCase() === 'FLAT' &&
      metadata.flat_id &&
      user?.id
    ) {
      const userRoles = user.roles || [];
      const isAdmin =
        userRoles.includes('SOCIETY_ADMIN') ||
        userRoles.includes('SUPER_ADMIN');
      const isUploader = metadata.uploaded_by === user.id;

      if (!isAdmin && !isUploader) {
        const residentRepo = this.dataSource.getRepository(Resident);
        const resident = await residentRepo.findOne({
          where: {
            user_id: user.id,
            organization_id: organizationId,
            flat_id: metadata.flat_id,
          },
        });
        if (!resident) {
          throw new ForbiddenException(
            'Access denied to private flat vault document',
          );
        }
      }
    }

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
    await recordAudit(
      this.auditService as any,
      {
        ...ctx,
        action: AuditAction.DELETE,
        entity_type: AuditEntityType.FILE,
        entity_id: (metadata as any).id ?? null,
        old_values: oldValues,
        new_values: null,
        ...extractRequestMeta(auditOptions?.request),
      } as never,
    );
  }

  private async findAuthorized(
    id: string,
    organizationId: string,
  ): Promise<FileMetadata> {
    if (!id || typeof id !== 'string') {
      throw new BadRequestException('Invalid file ID format');
    }

    const metadata = await this.dataSource
      .getRepository(FileMetadata)
      .findOne({
        where: { id, organization_id: organizationId, is_active: true },
      });

    if (!metadata) {
      throw new NotFoundException('File not found or access denied');
    }
    if (metadata.document_scope === 'NOTICE') throw new ForbiddenException('Use the authorized notice attachment endpoint');
    return metadata;
  }
}
