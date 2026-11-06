import {
  Injectable,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { Flat } from '../database/entities/flat.entity';
import { OrganizationContextService } from '../organization/organization-context.service';
import { Request } from 'express';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/audit.enums';
import {
  AuditCallContext,
  extractRequestMeta,
  recordAudit,
  resolveAuditContext,
  toSnapshot,
} from '../audit/audit-context';
@Injectable()
export class FlatService {
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

  async create(
    createFlatDto: {
      organization_id: string;
      building_id: string;
      floor_id: string;
      flat_identifier: string;
      flat_type?: string;
      maintenance_multiplier?: number;
    },
    passedOrgContext?: any,
  ) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    // Verify floor exists and belongs to the same organization as building
    const floor = await this.dataSource.getRepository('Floor').findOneBy({
      id: createFlatDto.floor_id,
      organization_id: createFlatDto.organization_id,
      building_id: createFlatDto.building_id,
    });

    if (!floor) {
      throw new ForbiddenException('Floor not found or access denied');
    }

    // Verify building belongs to same organization
    const building = await this.dataSource.getRepository('Building').findOneBy({
      id: createFlatDto.building_id,
      organization_id: createFlatDto.organization_id,
    });

    if (!building) {
      throw new ForbiddenException('Building not found or access denied');
    }

    // Check for duplicate flat identifier within the same organization/building.
    const flatIdentifier = (createFlatDto.flat_identifier ?? '').trim();

    const existingFlat = await this.dataSource.getRepository(Flat).findOneBy({
      organization_id: createFlatDto.organization_id,
      building_id: createFlatDto.building_id,
      flat_identifier: flatIdentifier,
    });

    let flat: Flat;
    if (existingFlat) {
      if (existingFlat.isActive) {
        throw new ConflictException(
          `Flat "${flatIdentifier}" already exists in this building. Flat identifiers must be unique within an organization and building.`,
        );
      }

      // A deactivated (soft-deleted) flat frees its identifier: the flat is not
      // listed anywhere, so re-adding it reactivates the same row with the new
      // configuration rather than rejecting. The DB unique constraint stays
      // intact because we never create a second row for the same identifier.
      existingFlat.floor_id = createFlatDto.floor_id;
      if (createFlatDto.flat_type !== undefined) {
        existingFlat.flat_type = createFlatDto.flat_type;
      }
      existingFlat.maintenance_multiplier =
        createFlatDto.maintenance_multiplier ?? 1.0;
      existingFlat.isActive = true;
      flat = existingFlat;
    } else {
      flat = this.dataSource.getRepository(Flat).create({
        id: randomUUID(),
        organization_id: createFlatDto.organization_id,
        building_id: createFlatDto.building_id,
        floor_id: createFlatDto.floor_id,
        flat_identifier: flatIdentifier,
        flat_type: createFlatDto.flat_type,
        maintenance_multiplier: createFlatDto.maintenance_multiplier ?? 1.0,
        isActive: true,
      });
    }

    try {
      await this.dataSource.getRepository(Flat).save(flat);
    } catch (err: any) {
      // A racing concurrent insert can trip the DB unique constraint
      // (PostgreSQL error 23505 = unique_violation). Report it as a 409
      // Conflict, never as a 403 authorization failure.
      const pgCode = err?.code ?? err?.driverError?.code;
      if (pgCode === '23505') {
        throw new ConflictException(
          `Flat "${flatIdentifier}" already exists in this building. Flat identifiers must be unique within an organization and building.`,
        );
      }
      throw err;
    }
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (flat as any).organization_id,
      }),
      action: AuditAction.CREATE,
      entity_type: AuditEntityType.FLAT,
      entity_id: (flat as any).id ?? null,
      old_values: null,
      new_values: toSnapshot(flat),
      ...extractRequestMeta(undefined),
    } as never);
    return flat;
  }

  async findAll(passedOrgContext?: any, includeInactive = false) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    const query = this.dataSource
      .getRepository(Flat)
      .createQueryBuilder('flat');

    const organizationId =
      orgContext.targetOrganizationId ??
      orgContext.organizationId ??
      orgContext.organization_id;

    if (organizationId) {
      query.where('flat.organization_id = :orgId', {
        orgId: organizationId,
      });
      if (!includeInactive) {
        query.andWhere('flat.is_active = true');
      }
    } else {
      query.where('1 = 0');
    }

    return query.getMany();
  }

  async findAllByBuilding(
    buildingId: string,
    passedOrgContext?: any,
    includeInactive = false,
  ) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    const query = this.dataSource
      .getRepository(Flat)
      .createQueryBuilder('flat');
    query.where('flat.building_id = :buildingId', { buildingId });

    if (!orgContext.isSuperAdmin && orgContext.organization_id) {
      query.andWhere('flat.organization_id = :orgId', {
        orgId: orgContext.organization_id,
      });
    }

    // Soft-deleted flats (is_active = false) are excluded from lists.
    if (!includeInactive) {
      query.andWhere('flat.is_active = true');
    }

    return query.getMany();
  }

  async findOne(id: string, passedOrgContext?: any) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    const flat = await this.dataSource.getRepository(Flat).findOneBy({
      id,
      organization_id:
        orgContext.isSuperAdmin && orgContext.targetOrganizationId
          ? orgContext.targetOrganizationId
          : orgContext.organization_id,
    });

    if (!flat) {
      throw new ForbiddenException('Flat not found or access denied');
    }
    return flat;
  }

  async update(
    id: string,
    updateFlatDto: {
      flat_identifier?: string;
      flat_type?: string;
      maintenance_multiplier?: number;
      isActive?: boolean;
      building_id?: string;
      floor_id?: string;
    },
    passedOrgContext?: any,
  ) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    const scopeOrgId =
      orgContext.isSuperAdmin && orgContext.targetOrganizationId
        ? orgContext.targetOrganizationId
        : orgContext.organization_id;

    const flat = await this.dataSource.getRepository(Flat).findOneBy({
      id,
      organization_id: scopeOrgId,
    });

    if (!flat) {
      throw new ForbiddenException('Flat not found or access denied');
    }

    if (!orgContext.isSuperAdmin) {
      if (flat.organization_id !== orgContext.organization_id) {
        throw new ForbiddenException(
          'You can only update flats in your organization',
        );
      }
    }

    // Reassignment support: the flat may be moved to another tower/floor. The
    // target floor must belong to the target building, and both must belong to
    // the organization (same guards as create — never trust a supplied id).
    const targetBuildingId = updateFlatDto.building_id ?? flat.building_id;
    const targetFloorId = updateFlatDto.floor_id ?? flat.floor_id;
    if (updateFlatDto.building_id || updateFlatDto.floor_id) {
      const floor = await this.dataSource.getRepository('Floor').findOneBy({
        id: targetFloorId,
        organization_id: scopeOrgId,
        building_id: targetBuildingId,
      });
      if (!floor) {
        throw new ForbiddenException('Floor not found or access denied');
      }
      const building = await this.dataSource.getRepository('Building').findOneBy({
        id: targetBuildingId,
        organization_id: scopeOrgId,
      });
      if (!building) {
        throw new ForbiddenException('Building not found or access denied');
      }
    }

    const flatIdentifier = (
      updateFlatDto.flat_identifier ?? flat.flat_identifier
    ).trim();

    // Moving towers/floors or renaming must not collide with a flat that
    // already holds the identifier at the destination. The DB unique
    // constraint treats every row the same (active or deactivated), so the
    // pre-check does too — a true collision surfaces as 409 Conflict.
    const locationChanged =
      flat.building_id !== targetBuildingId || flat.floor_id !== targetFloorId;
    const identifierChanged = flatIdentifier !== flat.flat_identifier;
    if (locationChanged || identifierChanged) {
      const occupied = await this.dataSource.getRepository(Flat).findOneBy({
        organization_id: scopeOrgId,
        building_id: targetBuildingId,
        flat_identifier: flatIdentifier,
      });
      if (occupied && occupied.id !== flat.id) {
        throw new ConflictException(
          `Flat identifier "${flatIdentifier}" already exists in the target building. Flat identifiers must be unique within an organization and building.`,
        );
      }
    }

    const oldValues = toSnapshot(flat);
    Object.assign(flat, {
      ...updateFlatDto,
      building_id: targetBuildingId,
      floor_id: targetFloorId,
      flat_identifier: flatIdentifier,
    });
    try {
      await this.dataSource.getRepository(Flat).save(flat);
    } catch (err: any) {
      // Editing flat_identifier / location to a value that already exists in
      // the destination building violates the unique constraint (23505).
      // Report as 409.
      const pgCode = err?.code ?? err?.driverError?.code;
      if (pgCode === '23505') {
        throw new ConflictException(
          `Flat identifier "${flatIdentifier}" already exists in this building. Flat identifiers must be unique within an organization and building.`,
        );
      }
      throw err;
    }
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (flat as any).organization_id,
      }),
      action: AuditAction.UPDATE,
      entity_type: AuditEntityType.FLAT,
      entity_id: (flat as any).id ?? null,
      old_values: oldValues,
      new_values: toSnapshot(flat),
      ...extractRequestMeta(undefined),
    } as never);
    return flat;
  }

  async remove(id: string, passedOrgContext?: any, permanent?: boolean) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    const flat = await this.dataSource.getRepository(Flat).findOneBy({
      id,
      organization_id:
        orgContext.isSuperAdmin && orgContext.targetOrganizationId
          ? orgContext.targetOrganizationId
          : orgContext.organization_id,
    });

    if (!flat) {
      throw new ForbiddenException('Flat not found or access denied');
    }

    // Inspect linked residents
    const residentRepo = this.dataSource.getRepository('Resident');
    const residentCount = await residentRepo.countBy({ flat_id: id });
    if (residentCount > 0) {
      throw new ForbiddenException(
        `Cannot delete flat "${flat.flat_identifier}". It has ${residentCount} assigned resident(s). Unassign or remove residents first.`,
      );
    }

    // Inspect pending maintenance dues
    const duesRepo = this.dataSource.getRepository('MaintenanceDue');
    if (duesRepo) {
      const duesCount = await duesRepo.countBy({ flat_id: id });
      if (duesCount > 0) {
        throw new ForbiddenException(
          `Cannot delete flat "${flat.flat_identifier}". It has historical financial maintenance due records. Flat can only be deactivated.`,
        );
      }
    }

    const oldValues = toSnapshot(flat);
    if (permanent) {
      await this.dataSource.getRepository(Flat).delete({ id });
    } else {
      flat.isActive = false;
      await this.dataSource.getRepository(Flat).save(flat);
    }

    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (flat as any).organization_id,
      }),
      action: AuditAction.DELETE,
      entity_type: AuditEntityType.FLAT,
      entity_id: (flat as any).id ?? null,
      old_values: oldValues,
      new_values: null,
      ...extractRequestMeta(undefined),
    } as never);
    return { ...flat, isActive: false, permanent: !!permanent };
  }
}
