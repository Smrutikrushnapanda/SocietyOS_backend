import { documentsOnly } from './document-query';
import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DocumentFolder } from '../database/entities/document-folder.entity';
import { FileMetadata } from '../database/entities/file-metadata.entity';
import { Resident } from '../database/entities/resident.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/audit.enums';
import {
  AuditCallContext,
  extractRequestMeta,
  recordAudit,
  resolveAuditContext,
  toSnapshot,
} from '../audit/audit-context';

const FOLDER_TYPES = new Set(['SOCIETY', 'FLAT']);
const MAX_NAME_LENGTH = 150;

export interface FolderListQuery {
  folderType?: string;
  parentId?: string;
  flatId?: string;
  buildingId?: string;
  search?: string;
}

/**
 * Folder management for the Document Repository.
 *
 * Organization isolation is applied on every query. Residents may only see
 * SOCIETY folders plus FLAT folders belonging to a flat they are resident of,
 * which keeps confidential flat vaults separated from society documents.
 */
@Injectable()
export class FolderService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  private sanitizeName(raw: string): string {
    const name = (raw || '').trim().replace(/\s+/g, ' ');
    if (!name) {
      throw new BadRequestException('Folder name is required');
    }
    if (name.length > MAX_NAME_LENGTH) {
      throw new BadRequestException(`Folder name must be ${MAX_NAME_LENGTH} characters or fewer`);
    }
    return name;
  }

  private isAdmin(roles: string[] = []): boolean {
    return roles.includes('SOCIETY_ADMIN') || roles.includes('SUPER_ADMIN');
  }

  private isResidentOnly(roles: string[] = []): boolean {
    return roles.includes('RESIDENT') && !this.isAdmin(roles);
  }

  /**
   * Resolves the flat IDs a resident is allowed to access. Empty array means
   * the user has no flat association at all.
   */
  private async getAllowedFlatIds(userId: string, organizationId: string): Promise<string[]> {
    const residentRepo = this.dataSource.getRepository(Resident);
    const residents = await residentRepo.find({
      where: { user_id: userId, organization_id: organizationId },
    });
    return residents.map((r) => r.flat_id).filter(Boolean) as string[];
  }

  private async resolveParent(
    organizationId: string,
    parentId: string,
  ): Promise<DocumentFolder> {
    const parent = await this.dataSource
      .getRepository(DocumentFolder)
      .findOne({
        where: { id: parentId, organization_id: organizationId, is_active: true },
      });

    if (!parent) {
      throw new NotFoundException('Parent folder not found or access denied');
    }
    return parent;
  }

  private async assertNoDuplicate(
    organizationId: string,
    name: string,
    parentId: string | null,
    excludeId?: string,
  ): Promise<void> {
    const repo = this.dataSource.getRepository(DocumentFolder);
    const qb = repo
      .createQueryBuilder('d')
      .where('d.organization_id = :organizationId', { organizationId })
      .andWhere('LOWER(d.name) = :name', { name: name.toLowerCase() })
      .andWhere('d.is_active = true');

    if (parentId) {
      qb.andWhere('d.parent_id = :parentId', { parentId });
    } else {
      qb.andWhere('d.parent_id IS NULL');
    }

    if (excludeId) {
      qb.andWhere('d.id != :excludeId', { excludeId });
    }

    const existing = await qb.getOne();
    if (existing) {
      throw new BadRequestException(
        `A folder named "${name}" already exists in this location`,
      );
    }
  }

  private async assertNoCycle(
    organizationId: string,
    folderId: string,
    newParentId: string,
  ): Promise<void> {
    let cursor: string | null = newParentId;
    const seen = new Set<string>();

    while (cursor) {
      if (cursor === folderId) {
        throw new BadRequestException('A folder cannot be moved inside itself');
      }
      if (seen.has(cursor)) {
        throw new BadRequestException('Invalid folder hierarchy detected');
      }
      seen.add(cursor);

      const parent: DocumentFolder | null = await this.dataSource
        .getRepository(DocumentFolder)
        .findOne({
          where: { id: cursor, organization_id: organizationId },
        });
      cursor = parent?.parent_id ?? null;
    }
  }

  private async assertFolderAccess(
    folder: DocumentFolder,
    userId: string,
    roles: string[],
  ): Promise<void> {
    if (this.isAdmin(roles)) return;

    if (folder.folder_type === 'FLAT' && folder.flat_id) {
      const allowedFlatIds = await this.getAllowedFlatIds(userId, folder.organization_id);
      if (!allowedFlatIds.includes(folder.flat_id) && folder.created_by !== userId) {
        throw new ForbiddenException('Access denied to private flat vault folder');
      }
    }
  }

  private emitAudit(
    action: AuditAction,
    entityId: string | null,
    oldValues: Record<string, unknown> | null,
    newValues: Record<string, unknown> | null,
    organizationId: string,
    userId: string,
    options?: AuditCallContext,
  ): void {
    const ctx = resolveAuditContext({
      orgContext: options?.orgContext ?? { userId, organizationId },
      actorUserId: options?.actorUserId ?? userId,
      entityOrganizationId: organizationId,
    });
    void recordAudit(this.auditService as any, {
      ...ctx,
      action,
      entity_type: AuditEntityType.DOCUMENT_FOLDER,
      entity_id: entityId,
      old_values: oldValues,
      new_values: newValues,
      ...extractRequestMeta(options?.request),
    } as never);
  }

  async create(
    organizationId: string,
    userId: string,
    dto: {
      name: string;
      description?: string | null;
      folderType?: string;
      parentId?: string | null;
      buildingId?: string | null;
      floorId?: string | null;
      flatId?: string | null;
    },
    roles: string[] = [],
    options?: AuditCallContext,
  ): Promise<DocumentFolder> {
    const name = this.sanitizeName(dto.name);

    const folderType = (dto.folderType || 'SOCIETY').toUpperCase();
    if (!FOLDER_TYPES.has(folderType)) {
      throw new BadRequestException(`Invalid folder type: ${dto.folderType}`);
    }

    const parentId = dto.parentId || null;
    let parent: DocumentFolder | null = null;

    if (parentId) {
      parent = await this.resolveParent(organizationId, parentId);
      await this.assertFolderAccess(parent, userId, roles);
      // A child inherits its parent's type so a society folder can never
      // contain a confidential flat vault (or vice versa).
      if ((parent.folder_type || '').toUpperCase() !== folderType) {
        throw new BadRequestException(
          'Child folder type must match its parent folder type',
        );
      }
    }

    if (folderType === 'FLAT' && !dto.flatId && !parent?.flat_id) {
      throw new BadRequestException('A flat vault folder must be assigned to a flat');
    }

    await this.assertNoDuplicate(organizationId, name, parentId);

    const repo = this.dataSource.getRepository(DocumentFolder);
    const folder = repo.create({
      organization_id: organizationId,
      created_by: userId,
      parent_id: parentId,
      name,
      folder_type: folderType,
      description: dto.description?.trim() || null,
      building_id: dto.buildingId ?? parent?.building_id ?? null,
      floor_id: dto.floorId ?? parent?.floor_id ?? null,
      flat_id: dto.flatId ?? parent?.flat_id ?? null,
      is_active: true,
      created_at: new Date(),
    } as Partial<DocumentFolder>);

    const saved = await repo.save(folder);
    this.emitAudit(
      AuditAction.CREATE,
      saved.id,
      null,
      toSnapshot(saved),
      organizationId,
      userId,
      options,
    );
    return saved;
  }

  async list(
    organizationId: string,
    actingUserId: string,
    actingUserRoles: string[] = [],
    query: FolderListQuery = {},
  ): Promise<{ data: DocumentFolder[]; total: number }> {
    const qb = this.dataSource
      .getRepository(DocumentFolder)
      .createQueryBuilder('d')
      .where('d.organization_id = :organizationId', { organizationId })
      .andWhere('d.is_active = true');

    if (this.isResidentOnly(actingUserRoles)) {
      const allowedFlatIds = await this.getAllowedFlatIds(actingUserId, organizationId);
      if (allowedFlatIds.length > 0) {
        qb.andWhere(
          "(d.folder_type = 'SOCIETY' OR (d.folder_type = 'FLAT' AND d.flat_id IN (:...allowedFlatIds)))",
          { allowedFlatIds },
        );
      } else {
        qb.andWhere("d.folder_type = 'SOCIETY'");
      }
    }

    if (query.folderType && query.folderType !== 'all') {
      qb.andWhere('UPPER(d.folder_type) = :folderType', {
        folderType: query.folderType.toUpperCase(),
      });
    }

    // Folder scoping. `root` is an explicit sentinel for top-level folders
    // (parent_id IS NULL) so the UI can distinguish it from "no filter applied"
    // — mirrors the file list's folderId handling in file.service.ts.
    if (query.parentId === 'root') {
      qb.andWhere('d.parent_id IS NULL');
    } else if (query.parentId && query.parentId !== 'all') {
      qb.andWhere('d.parent_id = :parentId', { parentId: query.parentId });
    }

    if (query.flatId && query.flatId !== 'all') {
      qb.andWhere('d.flat_id = :flatId', { flatId: query.flatId });
    }

    if (query.buildingId && query.buildingId !== 'all') {
      qb.andWhere('d.building_id = :buildingId', { buildingId: query.buildingId });
    }

    if (query.search && query.search.trim()) {
      const term = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        "(LOWER(d.name) LIKE :term OR LOWER(COALESCE(d.description, '')) LIKE :term)",
        { term },
      );
    }

    qb.orderBy('d.folder_type', 'ASC').addOrderBy('d.name', 'ASC');

    const data = await qb.getMany();
    return { data, total: data.length };
  }

  async findAuthorized(
    id: string,
    organizationId: string,
    userId: string,
    roles: string[] = [],
  ): Promise<DocumentFolder> {
    if (!id || typeof id !== 'string') {
      throw new BadRequestException('Invalid folder ID format');
    }

    const folder = await this.dataSource
      .getRepository(DocumentFolder)
      .findOne({ where: { id, organization_id: organizationId, is_active: true } });

    if (!folder) {
      throw new NotFoundException('Folder not found or access denied');
    }

    await this.assertFolderAccess(folder, userId, roles);
    return folder;
  }

  /**
   * Direct-document and child-folder counts for the supplied folders.
   * Counts respect the same flat-vault visibility rules as `list`.
   */
  async countsFor(
    organizationId: string,
    folderIds: string[],
    actingUserId: string,
    actingUserRoles: string[] = [],
  ): Promise<Record<string, { documentCount: number; childFolderCount: number }>> {
    const result: Record<string, { documentCount: number; childFolderCount: number }> = {};
    if (folderIds.length === 0) return result;

    const fileRepo = this.dataSource.getRepository(FileMetadata);

    for (const folderId of folderIds) {
      const fileQb = fileRepo
        .createQueryBuilder('f')
        .where('f.organization_id = :organizationId', { organizationId })
        .andWhere('f.is_active = true')
        .andWhere('f.folder_id = :folderId', { folderId });

      documentsOnly(fileQb);
      if (this.isResidentOnly(actingUserRoles)) {
        const allowedFlatIds = await this.getAllowedFlatIds(actingUserId, organizationId);
        if (allowedFlatIds.length > 0) {
          fileQb.andWhere(
            "(f.document_scope = 'SOCIETY' OR (f.document_scope = 'FLAT' AND f.flat_id IN (:...allowedFlatIds)))",
            { allowedFlatIds },
          );
        } else {
          fileQb.andWhere("f.document_scope = 'SOCIETY'");
        }
      }

      const documentCount = await fileQb.getCount();

      const childFolderCount = await this.dataSource
        .getRepository(DocumentFolder)
        .count({
          where: {
            organization_id: organizationId,
            parent_id: folderId,
            is_active: true,
          },
        });

      result[folderId] = { documentCount, childFolderCount };
    }

    return result;
  }

  /** Ancestor chain root → parent, used to render breadcrumbs. */
  async breadcrumbs(
    id: string,
    organizationId: string,
  ): Promise<DocumentFolder[]> {
    const chain: DocumentFolder[] = [];
    let cursor: string | null = id;
    const seen = new Set<string>();

    while (cursor) {
      if (seen.has(cursor)) break;
      seen.add(cursor);

      const folder: DocumentFolder | null = await this.dataSource
        .getRepository(DocumentFolder)
        .findOne({
          where: { id: cursor, organization_id: organizationId, is_active: true },
        });

      if (!folder) break;
      chain.unshift(folder);
      cursor = folder.parent_id ?? null;
    }

    return chain;
  }

  async rename(
    id: string,
    organizationId: string,
    userId: string,
    dto: { name?: string; description?: string | null },
    roles: string[] = [],
    options?: AuditCallContext,
  ): Promise<DocumentFolder> {
    const folder = await this.findAuthorized(id, organizationId, userId, roles);
    const oldValues = toSnapshot(folder);

    if (dto.name !== undefined) {
      const name = this.sanitizeName(dto.name);
      if (name.toLowerCase() !== folder.name.toLowerCase()) {
        await this.assertNoDuplicate(organizationId, name, folder.parent_id, folder.id);
      }
      folder.name = name;
    }

    if (dto.description !== undefined) {
      folder.description = dto.description?.trim() || null;
    }

    const saved = await this.dataSource.getRepository(DocumentFolder).save(folder);
    this.emitAudit(
      AuditAction.UPDATE,
      saved.id,
      oldValues,
      toSnapshot(saved),
      organizationId,
      userId,
      options,
    );
    return saved;
  }

  async move(
    id: string,
    organizationId: string,
    userId: string,
    dto: { parentId?: string | null },
    roles: string[] = [],
    options?: AuditCallContext,
  ): Promise<DocumentFolder> {
    const folder = await this.findAuthorized(id, organizationId, userId, roles);
    const oldValues = toSnapshot(folder);

    const parentId = dto.parentId || null;

    if (parentId) {
      const parent = await this.resolveParent(organizationId, parentId);
      await this.assertFolderAccess(parent, userId, roles);

      if ((parent.folder_type || '').toUpperCase() !== (folder.folder_type || '').toUpperCase()) {
        throw new BadRequestException(
          'Child folder type must match its parent folder type',
        );
      }
      await this.assertNoCycle(organizationId, folder.id, parentId);
    }

    await this.assertNoDuplicate(organizationId, folder.name, parentId, folder.id);

    folder.parent_id = parentId;
    const saved = await this.dataSource.getRepository(DocumentFolder).save(folder);
    this.emitAudit(
      AuditAction.UPDATE,
      saved.id,
      oldValues,
      toSnapshot(saved),
      organizationId,
      userId,
      options,
    );
    return saved;
  }

  /**
   * Deactivates a folder. Refuses to destroy content implicitly:
   *   - default        : only an empty folder may be deleted
   *   - detachContents : documents are unlinked (kept, folder_id = NULL)
   *   - archiveContents: documents inside are archived and unlinked
   */
  async remove(
    id: string,
    organizationId: string,
    userId: string,
    options?: {
      contentHandling?: 'detach' | 'archive';
    } & AuditCallContext,
  ): Promise<{ deactivated: boolean; detachedFiles: number; archivedFiles: number }> {
    const repo = this.dataSource.getRepository(DocumentFolder);
    const folder = await this.findAuthorized(id, organizationId, userId, []);

    const childFolderCount = await repo.count({
      where: { organization_id: organizationId, parent_id: folder.id, is_active: true },
    });

    const fileRepo = this.dataSource.getRepository(FileMetadata);
    const containedFiles = await fileRepo.find({
      where: { organization_id: organizationId, folder_id: folder.id, is_active: true },
    });

    if (childFolderCount > 0) {
      throw new BadRequestException(
        `Folder "${folder.name}" still contains ${childFolderCount} sub-folder(s). Move or delete them first.`,
      );
    }

    if (containedFiles.length > 0 && !options?.contentHandling) {
      throw new BadRequestException(
        `Folder "${folder.name}" is not empty (${containedFiles.length} document(s)). ` +
          'Move or delete its contents first, or choose how to handle them.',
      );
    }

    const oldValues = toSnapshot(folder);
    let detachedFiles = 0;
    let archivedFiles = 0;

    for (const file of containedFiles) {
      const fileOldValues = toSnapshot(file);
      if (options?.contentHandling === 'archive') {
        file.is_active = false;
        archivedFiles += 1;
      } else {
        detachedFiles += 1;
      }
      file.folder_id = null;
      await fileRepo.save(file);
      this.emitAudit(
        options?.contentHandling === 'archive' ? AuditAction.ARCHIVE : AuditAction.UPDATE,
        file.id,
        fileOldValues,
        toSnapshot(file),
        organizationId,
        userId,
        options,
      );
    }

    folder.is_active = false;
    await repo.save(folder);

    this.emitAudit(
      AuditAction.DELETE,
      folder.id,
      oldValues,
      toSnapshot(folder),
      organizationId,
      userId,
      options,
    );

    return { deactivated: true, detachedFiles, archivedFiles };
  }
}
