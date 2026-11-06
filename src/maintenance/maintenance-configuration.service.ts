import { randomUUID } from 'crypto';
import { UpdateMaintenanceConfigurationDto } from './dto';
import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MaintenanceConfiguration } from '../database/entities/maintenance-configuration.entity';
import { OrganizationContextService } from '../organization/organization-context.service';
import { Request } from 'express';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/audit.enums';
import { AuditCallContext, extractRequestMeta, recordAudit, resolveAuditContext, toSnapshot } from '../audit/audit-context';

@Injectable()
export class MaintenanceConfigurationService {
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

  async saveForOrganization(organizationId: string, dto: UpdateMaintenanceConfigurationDto, context: any) {
    const config = await this.findOneByOrganization(organizationId);
    const next = { base_maintenance_amount: 0, due_day_of_month: 10, late_charge_type: 'FIXED' as const, late_charge_value: 0, late_charge_grace_days: 0, late_charge_frequency: 'ONCE' as const, late_charge_start: 'FIRST_DAY' as const, ...config, ...dto };
    if (next.late_charge_type === 'PERCENTAGE' && next.late_charge_frequency !== 'ONCE') throw new BadRequestException('Percentage late fees apply once; recurring fees require a fixed amount');
    if (next.late_charge_type === 'PERCENTAGE' && next.late_charge_value > 100) throw new BadRequestException('Percentage must be between 0 and 100');
    if (config) return this.update(config.id, dto, context);
    return this.create({ ...next, organization_id: organizationId }, context);
  }

  async findOneByOrganization(organizationId: string) {
    const config = await this.dataSource
      .getRepository(MaintenanceConfiguration)
      .findOneBy({
        organization_id: organizationId,
      });
    return config;
  }

  async findAllByOrganization(organizationId: string) {
    return this.dataSource.getRepository(MaintenanceConfiguration).findBy({
      organization_id: organizationId,
      is_active: true,
    });
  }

  async create(
    createDto: {
      organization_id: string;
      base_maintenance_amount: number;
      due_day_of_month: number;
      late_charge_type: 'FIXED' | 'PERCENTAGE';
      late_charge_frequency?: 'ONCE' | 'DAILY' | 'WEEKLY';
      late_charge_start?: 'FIRST_DAY' | 'AFTER_PERIOD';
      late_charge_value: number;
      late_charge_grace_days: number;
    },
    passedOrgContext?: any,
  ) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    // Check organization access
    if (!orgContext.isSuperAdmin && orgContext.organization_id) {
      if (createDto.organization_id !== orgContext.organization_id) {
        throw new ForbiddenException(
          'You can only create maintenance config in your organization',
        );
      }
    }

    const config = this.dataSource
      .getRepository(MaintenanceConfiguration)
      .create({
        id: randomUUID(),
        organization_id: createDto.organization_id,
        base_maintenance_amount: createDto.base_maintenance_amount,
        due_day_of_month: createDto.due_day_of_month,
        late_charge_type: createDto.late_charge_type,
        late_charge_value: createDto.late_charge_value,
        late_charge_grace_days: createDto.late_charge_grace_days,
        late_charge_frequency: createDto.late_charge_frequency ?? 'ONCE',
        late_charge_start: createDto.late_charge_start ?? 'FIRST_DAY',
        is_active: true,
      } as any);

    await this.dataSource.getRepository(MaintenanceConfiguration).save(config);
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (config as any).organization_id,
      }),
      action: AuditAction.CREATE,
      entity_type: AuditEntityType.MAINTENANCE_CONFIGURATION,
      entity_id: (config as any).id ?? null,
      old_values: null,
      new_values: toSnapshot(config),
      ...extractRequestMeta(undefined),
    } as never);
    return config;
  }

  async update(
    id: string,
    updateDto: {
      base_maintenance_amount?: number;
      due_day_of_month?: number;
      late_charge_type?: 'FIXED' | 'PERCENTAGE';
      late_charge_frequency?: 'ONCE' | 'DAILY' | 'WEEKLY';
      late_charge_start?: 'FIRST_DAY' | 'AFTER_PERIOD';
      late_charge_value?: number;
      late_charge_grace_days?: number;
      is_active?: boolean;
    },
    passedOrgContext?: any,
  ) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    const config = await this.dataSource
      .getRepository(MaintenanceConfiguration)
      .findOneBy({
        id,
        organization_id:
          orgContext.isSuperAdmin && orgContext.targetOrganizationId
            ? orgContext.targetOrganizationId
            : orgContext.organization_id,
      });

    if (!config) {
      throw new ForbiddenException(
        'Maintenance configuration not found or access denied',
      );
    }

    if (!orgContext.isSuperAdmin) {
      if (config.organization_id !== orgContext.organization_id) {
        throw new ForbiddenException(
          'You can only update maintenance config in your organization',
        );
      }
    }

    const oldValues = toSnapshot(config);
    Object.assign(config, updateDto);
    await this.dataSource.getRepository(MaintenanceConfiguration).save(config);
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (config as any).organization_id,
      }),
      action: AuditAction.UPDATE,
      entity_type: AuditEntityType.MAINTENANCE_CONFIGURATION,
      entity_id: (config as any).id ?? null,
      old_values: oldValues,
      new_values: toSnapshot(config),
      ...extractRequestMeta(undefined),
    } as never);
    return config;
  }
}
