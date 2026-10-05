import { Injectable, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
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

  async create(createFlatDto: {
    organization_id: string;
    building_id: string;
    floor_id: string;
    flat_identifier: string;
    flat_type?: string;
    maintenance_multiplier?: number;
  }) {
    const orgContext =
      (await this.organizationContextService.getCurrentOrganization(
        {} as any,
      )) as any;

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

    // Check for duplicate flat identifier within the same organization/building
    const existingFlat = await this.dataSource.getRepository(Flat).findOneBy({
      organization_id: createFlatDto.organization_id,
      building_id: createFlatDto.building_id,
      flat_identifier: createFlatDto.flat_identifier,
    });

    if (existingFlat) {
      throw new ForbiddenException(
        'Flat identifier must be unique within organization/building',
      );
    }

    const flat = this.dataSource.getRepository(Flat).create({
      id: '00000000-0000-0000-0000-000000000000',
      organization_id: createFlatDto.organization_id,
      building_id: createFlatDto.building_id,
      floor_id: createFlatDto.floor_id,
      flat_identifier: createFlatDto.flat_identifier,
      flat_type: createFlatDto.flat_type,
      maintenance_multiplier: createFlatDto.maintenance_multiplier ?? 1.0,
      isActive: true,
    });

    await this.dataSource.getRepository(Flat).save(flat);
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

  async findAll() {
    const orgContext =
      (await this.organizationContextService.getCurrentOrganization(
        {} as any,
      )) as any;

    const query = this.dataSource
      .getRepository(Flat)
      .createQueryBuilder('flat');

    if (!orgContext.isSuperAdmin && orgContext.organization_id) {
      query.where('flat.organization_id = :orgId', {
        orgId: orgContext.organization_id,
      });
    } else {
      query.where('1 = 0');
    }

    return query.getMany();
  }

  async findAllByBuilding(buildingId: string) {
    const orgContext =
      (await this.organizationContextService.getCurrentOrganization(
        {} as any,
      )) as any;

    const query = this.dataSource
      .getRepository(Flat)
      .createQueryBuilder('flat');
    query.where('flat.building_id = :buildingId', { buildingId });

    if (!orgContext.isSuperAdmin && orgContext.organization_id) {
      query.andWhere('flat.organization_id = :orgId', {
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
    },
  ) {
    const orgContext =
      (await this.organizationContextService.getCurrentOrganization(
        {} as any,
      )) as any;

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

    if (!orgContext.isSuperAdmin) {
      if (flat.organization_id !== orgContext.organization_id) {
        throw new ForbiddenException(
          'You can only update flats in your organization',
        );
      }
    }

    const oldValues = toSnapshot(flat);
    Object.assign(flat, updateFlatDto);
    await this.dataSource.getRepository(Flat).save(flat);
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

  async remove(id: string) {
    const orgContext =
      (await this.organizationContextService.getCurrentOrganization(
        {} as any,
      )) as any;

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

    const oldValues = toSnapshot(flat);
    flat.isActive = false;
    await this.dataSource.getRepository(Flat).save(flat);
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
    return flat;
  }
}
