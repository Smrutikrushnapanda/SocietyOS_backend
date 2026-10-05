import { Injectable, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
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

  async create(createBuildingDto: {
    organization_id: string;
    name: string;
    code?: string;
    totalFloors?: number;
  }) {
    const orgContext =
      (await this.organizationContextService.getCurrentOrganization(
        {} as any,
      )) as any;

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
      id: '00000000-0000-0000-0000-000000000000',
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

  async findAll() {
    const orgContext =
      (await this.organizationContextService.getCurrentOrganization(
        {} as any,
      )) as any;

    const query = this.dataSource
      .getRepository(Building)
      .createQueryBuilder('building');

    if (!orgContext.isSuperAdmin && orgContext.organization_id) {
      query.where('building.organization_id = :orgId', {
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
  ) {
    const orgContext =
      (await this.organizationContextService.getCurrentOrganization(
        {} as any,
      )) as any;

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
    Object.assign(building, updateBuildingDto);
    await this.dataSource.getRepository(Building).save(building);
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
    return building;
  }

  async remove(id: string) {
    const orgContext =
      (await this.organizationContextService.getCurrentOrganization(
        {} as any,
      )) as any;

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

    const oldValues = toSnapshot(building);
    building.isActive = false;
    await this.dataSource.getRepository(Building).save(building);
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
    return building;
  }
}
