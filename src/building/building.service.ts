import { Injectable, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { Building } from '../database/entities/building.entity';
import { OrganizationContextService } from '../organization/organization-context.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/audit.enums';
import {
  extractRequestMeta,
  recordAudit,
  resolveAuditContext,
  toSnapshot,
} from '../audit/audit-context';

@Injectable()
export class BuildingService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly organizationContextService: OrganizationContextService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    createBuildingDto: {
      organization_id: string;
      name: string;
      code?: string;
      totalFloors?: number;
    },
    passedOrgContext?: any,
  ) {
    // Phase 11 Step 2: the guard-resolved organization context is the only
    // trusted context source; the fallback keeps direct (non-HTTP) callers
    // fail-closed with an empty context.
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    if (orgContext.isSuperAdmin) {
      if (
        createBuildingDto.organization_id &&
        orgContext.targetOrganizationId
      ) {
        if (
          createBuildingDto.organization_id !== orgContext.targetOrganizationId
        ) {
          throw new ForbiddenException(
            'SUPER_ADMIN must create building in target organization',
          );
        }
      }
    } else {
      if (
        orgContext.organization_id &&
        createBuildingDto.organization_id !== orgContext.organization_id
      ) {
        throw new ForbiddenException(
          'You can only create buildings in your organization',
        );
      }
    }

    const building = this.dataSource.getRepository(Building).create({
      id: randomUUID(),
      organization_id: createBuildingDto.organization_id,
      name: createBuildingDto.name,
      code: createBuildingDto.code,
      totalFloors: createBuildingDto.totalFloors,
      isActive: true,
    } as Partial<Building>);

    await this.dataSource.getRepository(Building).save(building);
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (building as any).organization_id,
      }),
      action: AuditAction.CREATE,
      entity_type: AuditEntityType.BUILDING,
      entity_id: (building as any).id ?? null,
      old_values: null,
      new_values: toSnapshot(building),
      ...extractRequestMeta(undefined),
    } as never);
    return building;
  }

  async findAll(passedOrgContext?: any, includeInactive?: boolean) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    const query = this.dataSource
      .getRepository(Building)
      .createQueryBuilder('building');

    const organizationId =
      orgContext.targetOrganizationId ??
      orgContext.organizationId ??
      orgContext.organization_id;

    if (organizationId) {
      query.where('building.organization_id = :orgId', {
        orgId: organizationId,
      });
      if (!includeInactive) {
        query.andWhere('building.is_active = true');
      }
    } else if (!orgContext.isSuperAdmin) {
      query.where('1 = 0');
    }

    return query.getMany();
  }

  async findOne(id: string, passedOrgContext?: any) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    const building = await this.dataSource.getRepository(Building).findOneBy({
      id,
      organization_id:
        orgContext.isSuperAdmin && orgContext.targetOrganizationId
          ? orgContext.targetOrganizationId
          : orgContext.organization_id,
    });

    if (!building) {
      throw new ForbiddenException('Building not found or access denied');
    }
    return building;
  }

  async update(
    id: string,
    updateBuildingDto: {
      name?: string;
      code?: string;
      totalFloors?: number;
      isActive?: boolean;
    },
    passedOrgContext?: any,
  ) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    const building = await this.dataSource.getRepository(Building).findOneBy({
      id,
      organization_id:
        orgContext.isSuperAdmin && orgContext.targetOrganizationId
          ? orgContext.targetOrganizationId
          : orgContext.organization_id,
    });

    if (!building) {
      throw new ForbiddenException('Building not found or access denied');
    }

    if (!orgContext.isSuperAdmin) {
      if (building.organization_id !== orgContext.organization_id) {
        throw new ForbiddenException(
          'You can only update buildings in your organization',
        );
      }
    }

    const oldValues = toSnapshot(building);
    const prevTotalFloors = (building as any).totalFloors ?? 0;
    Object.assign(building, updateBuildingDto);
    await this.dataSource.getRepository(Building).save(building);

    // When floor count is reduced, prune excess floor records that have no flats.
    const newTotalFloors = updateBuildingDto.totalFloors;
    let floorsWithFlatsSkipped = 0;
    if (
      newTotalFloors !== undefined &&
      prevTotalFloors > newTotalFloors
    ) {
      const floorRepo = this.dataSource.getRepository('Floor');
      const flatRepo = this.dataSource.getRepository('Flat');

      // Find all floor records for this building above the new limit
      const excessFloors: any[] = await (floorRepo as any).find({
        where: { building_id: id },
      });

      for (const floor of excessFloors) {
        if (floor.floor_number > newTotalFloors) {
          // Only delete if no flats are assigned to this floor
          const flatCount = await (flatRepo as any).count
            ? await (flatRepo as any).count({ where: { floor_id: floor.id } })
            : await (flatRepo as any).countBy({ floor_id: floor.id });

          if (flatCount === 0) {
            await (floorRepo as any).delete({ id: floor.id });
          } else {
            floorsWithFlatsSkipped++;
          }
        }
      }
    }

    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (building as any).organization_id,
      }),
      action: AuditAction.UPDATE,
      entity_type: AuditEntityType.BUILDING,
      entity_id: (building as any).id ?? null,
      old_values: oldValues,
      new_values: toSnapshot(building),
      ...extractRequestMeta(undefined),
    } as never);
    return {
      ...building,
      ...(floorsWithFlatsSkipped > 0 && {
        warning: `${floorsWithFlatsSkipped} floor(s) above the new limit still have flats and were not removed.`,
      }),
    };
  }

  async remove(id: string, passedOrgContext?: any, permanent?: boolean) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    const building = await this.dataSource.getRepository(Building).findOneBy({
      id,
      organization_id:
        orgContext.isSuperAdmin && orgContext.targetOrganizationId
          ? orgContext.targetOrganizationId
          : orgContext.organization_id,
    });

    if (!building) {
      throw new ForbiddenException('Building not found or access denied');
    }

    // Inspect linked units (flats) before deletion
    const flatRepo = this.dataSource.getRepository('Flat');
    let flatCount = 0;
    if (flatRepo && typeof (flatRepo as any).countBy === 'function') {
      flatCount = await (flatRepo as any).countBy({ building_id: id });
    } else if (flatRepo && typeof (flatRepo as any).count === 'function') {
      flatCount = await (flatRepo as any).count({ where: { building_id: id } });
    }
    if (flatCount > 0) {
      throw new ForbiddenException(
        `Cannot delete building "${building.name}". It contains ${flatCount} flats/units. Remove or reassign flats first.`,
      );
    }

    const oldValues = toSnapshot(building);

    if (permanent) {
      // Clean up linked empty placeholder floors before removing building
      const floorRepo = this.dataSource.getRepository('Floor');
      await floorRepo.delete({ building_id: id });
      await this.dataSource.getRepository(Building).delete({ id });
    } else {
      building.isActive = false;
      await this.dataSource.getRepository(Building).save(building);
    }

    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (building as any).organization_id,
      }),
      action: AuditAction.DELETE,
      entity_type: AuditEntityType.BUILDING,
      entity_id: (building as any).id ?? null,
      old_values: oldValues,
      new_values: null,
      ...extractRequestMeta(undefined),
    } as never);
    return { ...building, isActive: false, permanent: !!permanent };
  }
}
