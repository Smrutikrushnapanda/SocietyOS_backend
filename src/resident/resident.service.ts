import { Injectable, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Resident } from '../database/entities/resident.entity';
import { User } from '../database/entities/user.entity';
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
export class ResidentService {
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

  async createResident(createResidentDto: {
    user_id: string;
    organization_id: string;
    flat_id?: string;
  }) {
    const orgContext =
      (await this.organizationContextService.getCurrentOrganization(
        {} as any,
      )) as any;

    // Verify user exists
    const userRepository = this.dataSource.getRepository('User');
    const user = await userRepository.findOneBy({
      id: createResidentDto.user_id,
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Verify organization matches user's organization (for normal users)
    if (!orgContext.isSuperAdmin && orgContext.organization_id) {
      if (createResidentDto.organization_id !== orgContext.organization_id) {
        throw new ForbiddenException(
          'You can only create residents in your organization',
        );
      }
    }

    // If flatId is provided, verify it belongs to the same organization
    if (createResidentDto.flat_id) {
      const flat = await this.dataSource.getRepository('Flat').findOneBy({
        id: createResidentDto.flat_id,
        organization_id: createResidentDto.organization_id,
      });

      if (!flat) {
        throw new ForbiddenException('Flat not found or access denied');
      }
    }

    const resident = this.dataSource.getRepository(Resident).create({
      id: '00000000-0000-0000-0000-000000000000',
      user_id: createResidentDto.user_id,
      organization_id: createResidentDto.organization_id,
      flat_id: createResidentDto.flat_id,
      kyc_status: 'PENDING',
      isActive: true,
    });

    await this.dataSource.getRepository(Resident).save(resident);
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (resident as any).organization_id,
      }),
      action: AuditAction.CREATE,
      entity_type: AuditEntityType.RESIDENT,
      entity_id: (resident as any).id ?? null,
      old_values: null,
      new_values: toSnapshot(resident),
      ...extractRequestMeta(undefined),
    } as never);
    return resident;
  }

  async findAll() {
    const orgContext =
      (await this.organizationContextService.getCurrentOrganization(
        {} as any,
      )) as any;

    const query = this.dataSource
      .getRepository(Resident)
      .createQueryBuilder('resident');

    if (!orgContext.isSuperAdmin && orgContext.organization_id) {
      query.where('resident.organization_id = :orgId', {
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

    const resident = await this.dataSource.getRepository(Resident).findOneBy({
      id,
      organization_id:
        orgContext.isSuperAdmin && orgContext.targetOrganizationId
          ? orgContext.targetOrganizationId
          : orgContext.organization_id,
    });

    if (!resident) {
      throw new ForbiddenException('Resident not found or access denied');
    }
    return resident;
  }

  async update(
    id: string,
    updateResidentDto: {
      flat_id?: string;
      kyc_status?: 'PENDING' | 'VERIFIED' | 'REJECTED';
      app_access_status?: boolean;
    },
  ) {
    const orgContext =
      (await this.organizationContextService.getCurrentOrganization(
        {} as any,
      )) as any;

    const resident = await this.dataSource.getRepository(Resident).findOneBy({
      id,
      organization_id:
        orgContext.isSuperAdmin && orgContext.targetOrganizationId
          ? orgContext.targetOrganizationId
          : orgContext.organization_id,
    });

    if (!resident) {
      throw new ForbiddenException('Resident not found or access denied');
    }

    if (!orgContext.isSuperAdmin) {
      if (resident.organization_id !== orgContext.organization_id) {
        throw new ForbiddenException(
          'You can only update residents in your organization',
        );
      }
    }

    const oldValues = toSnapshot(resident);
    if (updateResidentDto.flat_id) {
      const flat = await this.dataSource.getRepository('Flat').findOneBy({
        id: updateResidentDto.flat_id,
        organization_id: resident.organization_id,
      });

      if (!flat) {
        throw new ForbiddenException('Flat not found or access denied');
      }
      resident.flat_id = updateResidentDto.flat_id;
    }

    if (updateResidentDto.kyc_status) {
      resident.kyc_status = updateResidentDto.kyc_status;
    }

    if (updateResidentDto.app_access_status !== undefined) {
      resident.app_access_status = updateResidentDto.app_access_status;
    }

    await this.dataSource.getRepository(Resident).save(resident);
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (resident as any).organization_id,
      }),
      action: AuditAction.UPDATE,
      entity_type: AuditEntityType.RESIDENT,
      entity_id: (resident as any).id ?? null,
      old_values: oldValues,
      new_values: toSnapshot(resident),
      ...extractRequestMeta(undefined),
    } as never);
    return resident;
  }

  async assignFlat(residentId: string, flatId: string) {
    const orgContext =
      (await this.organizationContextService.getCurrentOrganization(
        {} as any,
      )) as any;

    const resident = await this.dataSource.getRepository(Resident).findOneBy({
      id: residentId,
      organization_id:
        orgContext.isSuperAdmin && orgContext.targetOrganizationId
          ? orgContext.targetOrganizationId
          : orgContext.organization_id,
    });

    if (!resident) {
      throw new ForbiddenException('Resident not found or access denied');
    }

    const flat = await this.dataSource.getRepository('Flat').findOneBy({
      id: flatId,
      organization_id:
        orgContext.isSuperAdmin && orgContext.targetOrganizationId
          ? orgContext.targetOrganizationId
          : orgContext.organization_id,
    });

    if (!flat) {
      throw new ForbiddenException('Flat not found or access denied');
    }

    // Verify resident and flat belong to the same organization
    if (resident.organization_id !== flat.organization_id) {
      throw new ForbiddenException(
        'Resident and flat must belong to the same organization',
      );
    }

    const oldValues = toSnapshot(resident);
    resident.flat_id = flatId;
    await this.dataSource.getRepository(Resident).save(resident);
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (resident as any).organization_id,
      }),
      action: AuditAction.ASSIGN,
      entity_type: AuditEntityType.RESIDENT,
      entity_id: (resident as any).id ?? null,
      old_values: oldValues,
      new_values: toSnapshot(resident),
      ...extractRequestMeta(undefined),
    } as never);
    return resident;
  }

  async assignAppAccess(residentId: string, appAccessStatus: boolean) {
    const orgContext =
      (await this.organizationContextService.getCurrentOrganization(
        {} as any,
      )) as any;

    const resident = await this.dataSource.getRepository(Resident).findOneBy({
      id: residentId,
      organization_id:
        orgContext.isSuperAdmin && orgContext.targetOrganizationId
          ? orgContext.targetOrganizationId
          : orgContext.organization_id,
    });

    if (!resident) {
      throw new ForbiddenException('Resident not found or access denied');
    }

    if (!orgContext.isSuperAdmin) {
      if (resident.organization_id !== orgContext.organization_id) {
        throw new ForbiddenException(
          'You can only update app access for residents in your organization',
        );
      }
    }

    const oldValues = toSnapshot(resident);
    resident.app_access_status = appAccessStatus;
    await this.dataSource.getRepository(Resident).save(resident);
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (resident as any).organization_id,
      }),
      action: AuditAction.UPDATE,
      entity_type: AuditEntityType.RESIDENT,
      entity_id: (resident as any).id ?? null,
      old_values: oldValues,
      new_values: toSnapshot(resident),
      ...extractRequestMeta(undefined),
    } as never);
    return resident;
  }
}
