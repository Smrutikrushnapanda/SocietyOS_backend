import { Injectable, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { Floor } from '../database/entities/floor.entity';
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
export class FloorService {
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
    createFloorDto: {
      organization_id: string;
      building_id: string;
      floor_number: number;
      name?: string;
    },
    passedOrgContext?: any,
  ) {
    // Verify building exists and belongs to the same organization
    const building = await this.dataSource.getRepository('Building').findOneBy({
      id: createFloorDto.building_id,
      organization_id: createFloorDto.organization_id,
    });

    if (!building) {
      throw new ForbiddenException('Building not found or access denied');
    }

    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    if (!orgContext.isSuperAdmin && orgContext.organization_id) {
      if (building.organization_id !== orgContext.organization_id) {
        throw new ForbiddenException(
          'You can only add floors to buildings in your organization',
        );
      }
    }

    // Check for duplicate floor number within the same building
    const existingFloor = await this.dataSource.getRepository(Floor).findOneBy({
      building_id: createFloorDto.building_id,
      floor_number: createFloorDto.floor_number,
    });

    if (existingFloor) {
      throw new ForbiddenException(
        'Duplicate floor number within the same building',
      );
    }

    const floor = this.dataSource.getRepository(Floor).create({
      id: randomUUID(),
      organization_id: createFloorDto.organization_id,
      building_id: createFloorDto.building_id,
      floor_number: createFloorDto.floor_number,
      name: createFloorDto.name,
      isActive: true,
    });

    await this.dataSource.getRepository(Floor).save(floor);
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (floor as any).organization_id,
      }),
      action: AuditAction.CREATE,
      entity_type: AuditEntityType.FLOOR,
      entity_id: (floor as any).id ?? null,
      old_values: null,
      new_values: toSnapshot(floor),
      ...extractRequestMeta(undefined),
    } as never);
    return floor;
  }

  async findAll(passedOrgContext?: any) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    const query = this.dataSource
      .getRepository(Floor)
      .createQueryBuilder('floor');

    const organizationId =
      orgContext.targetOrganizationId ??
      orgContext.organizationId ??
      orgContext.organization_id;

    if (organizationId) {
      query.where('floor.organization_id = :orgId', {
        orgId: organizationId,
      });
    } else {
      query.where('1 = 0');
    }

    return query.getMany();
  }

  async findAllByBuilding(buildingId: string, passedOrgContext?: any) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    const query = this.dataSource
      .getRepository(Floor)
      .createQueryBuilder('floor');
    query.where('floor.building_id = :buildingId', { buildingId });

    if (!orgContext.isSuperAdmin && orgContext.organization_id) {
      query.andWhere('floor.organization_id = :orgId', {
        orgId: orgContext.organization_id,
      });
    }

    return query.getMany();
  }

  async findOne(id: string, passedOrgContext?: any) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    const floor = await this.dataSource.getRepository(Floor).findOneBy({
      id,
      organization_id:
        orgContext.isSuperAdmin && orgContext.targetOrganizationId
          ? orgContext.targetOrganizationId
          : orgContext.organization_id,
    });

    if (!floor) {
      throw new ForbiddenException('Floor not found or access denied');
    }
    return floor;
  }

  async update(
    id: string,
    updateFloorDto: {
      floor_number?: number;
      name?: string;
      isActive?: boolean;
    },
    passedOrgContext?: any,
  ) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    const floor = await this.dataSource.getRepository(Floor).findOneBy({
      id,
      organization_id:
        orgContext.isSuperAdmin && orgContext.targetOrganizationId
          ? orgContext.targetOrganizationId
          : orgContext.organization_id,
    });

    if (!floor) {
      throw new ForbiddenException('Floor not found or access denied');
    }

    if (!orgContext.isSuperAdmin) {
      if (floor.organization_id !== orgContext.organization_id) {
        throw new ForbiddenException(
          'You can only update floors in your organization',
        );
      }
    }

    const oldFloorValues = toSnapshot(floor);
    Object.assign(floor, updateFloorDto);
    await this.dataSource.getRepository(Floor).save(floor);
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (floor as any).organization_id,
      }),
      action: AuditAction.UPDATE,
      entity_type: AuditEntityType.FLOOR,
      entity_id: (floor as any).id ?? null,
      old_values: oldFloorValues,
      new_values: toSnapshot(floor),
      ...extractRequestMeta(undefined),
    } as never);
    return floor;
  }

  async remove(id: string, passedOrgContext?: any, permanent?: boolean) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    const floor = await this.dataSource.getRepository(Floor).findOneBy({
      id,
      organization_id:
        orgContext.isSuperAdmin && orgContext.targetOrganizationId
          ? orgContext.targetOrganizationId
          : orgContext.organization_id,
    });

    if (!floor) {
      throw new ForbiddenException('Floor not found or access denied');
    }

    // Inspect linked units (flats) on this floor
    const flatRepo = this.dataSource.getRepository('Flat');
    const flatCount = await flatRepo.countBy({ floor_id: id });
    if (flatCount > 0) {
      throw new ForbiddenException(
        `Cannot delete floor "${floor.name || floor.floor_number}". It contains ${flatCount} flats/units. Remove or reassign flats first.`,
      );
    }

    const oldFloorDeleteValues = toSnapshot(floor);
    if (permanent) {
      await this.dataSource.getRepository(Floor).delete({ id });
    } else {
      floor.isActive = false;
      await this.dataSource.getRepository(Floor).save(floor);
    }

    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (floor as any).organization_id,
      }),
      action: AuditAction.DELETE,
      entity_type: AuditEntityType.FLOOR,
      entity_id: (floor as any).id ?? null,
      old_values: oldFloorDeleteValues,
      new_values: null,
      ...extractRequestMeta(undefined),
    } as never);
    return { ...floor, isActive: false, permanent: !!permanent };
  }
}
