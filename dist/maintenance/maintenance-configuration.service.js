"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaintenanceConfigurationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const maintenance_configuration_entity_1 = require("../database/entities/maintenance-configuration.entity");
const organization_context_service_1 = require("../organization/organization-context.service");
const audit_service_1 = require("../audit/audit.service");
const audit_enums_1 = require("../audit/audit.enums");
const audit_context_1 = require("../audit/audit-context");
let MaintenanceConfigurationService = class MaintenanceConfigurationService {
    dataSource;
    organizationContextService;
    auditService;
    constructor(dataSource, organizationContextService, auditService) {
        this.dataSource = dataSource;
        this.organizationContextService = organizationContextService;
        this.auditService = auditService;
    }
    buildAuditOptions(passed, entityOrganizationId, actorUserId) {
        return {
            orgContext: (passed?.orgContext ?? null),
            actorUserId: passed?.actorUserId ?? actorUserId ?? null,
            entityOrganizationId: passed?.entityOrganizationId ?? entityOrganizationId ?? null,
            request: passed?.request,
        };
    }
    emitAudit(action, entityType, entityId, oldValues, newValues, options) {
        const opts = this.buildAuditOptions(options, newValues?.organization_id ?? oldValues?.organization_id ?? options?.entityOrganizationId ?? null, options?.actorUserId ?? null);
        const ctx = (0, audit_context_1.resolveAuditContext)({ orgContext: opts.orgContext, actorUserId: opts.actorUserId ?? undefined, entityOrganizationId: opts.entityOrganizationId ?? undefined });
        const meta = (0, audit_context_1.extractRequestMeta)(opts.request);
        void (0, audit_context_1.recordAudit)(this.auditService, { ...ctx, action, entity_type: entityType, entity_id: entityId, old_values: oldValues, new_values: newValues, ...meta });
    }
    async findOneByOrganization(organizationId) {
        const config = await this.dataSource
            .getRepository(maintenance_configuration_entity_1.MaintenanceConfiguration)
            .findOneBy({
            organization_id: organizationId,
        });
        return config;
    }
    async findAllByOrganization(organizationId) {
        return this.dataSource.getRepository(maintenance_configuration_entity_1.MaintenanceConfiguration).findBy({
            organization_id: organizationId,
            is_active: true,
        });
    }
    async create(createDto) {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        if (!orgContext.isSuperAdmin && orgContext.organization_id) {
            if (createDto.organization_id !== orgContext.organization_id) {
                throw new common_1.ForbiddenException('You can only create maintenance config in your organization');
            }
        }
        const config = this.dataSource
            .getRepository(maintenance_configuration_entity_1.MaintenanceConfiguration)
            .create({
            organization_id: createDto.organization_id,
            base_maintenance_amount: createDto.base_maintenance_amount,
            due_day_of_month: createDto.due_day_of_month,
            late_charge_type: createDto.late_charge_type,
            late_charge_value: createDto.late_charge_value,
            late_charge_grace_days: createDto.late_charge_grace_days,
            isActive: true,
        });
        await this.dataSource.getRepository(maintenance_configuration_entity_1.MaintenanceConfiguration).save(config);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: config.organization_id,
            }),
            action: audit_enums_1.AuditAction.CREATE,
            entity_type: audit_enums_1.AuditEntityType.MAINTENANCE_CONFIGURATION,
            entity_id: config.id ?? null,
            old_values: null,
            new_values: (0, audit_context_1.toSnapshot)(config),
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return config;
    }
    async update(id, updateDto) {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const config = await this.dataSource
            .getRepository(maintenance_configuration_entity_1.MaintenanceConfiguration)
            .findOneBy({
            id,
            organization_id: orgContext.isSuperAdmin && orgContext.targetOrganizationId
                ? orgContext.targetOrganizationId
                : orgContext.organization_id,
        });
        if (!config) {
            throw new common_1.ForbiddenException('Maintenance configuration not found or access denied');
        }
        if (!orgContext.isSuperAdmin) {
            if (config.organization_id !== orgContext.organization_id) {
                throw new common_1.ForbiddenException('You can only update maintenance config in your organization');
            }
        }
        const oldValues = (0, audit_context_1.toSnapshot)(config);
        Object.assign(config, updateDto);
        await this.dataSource.getRepository(maintenance_configuration_entity_1.MaintenanceConfiguration).save(config);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: config.organization_id,
            }),
            action: audit_enums_1.AuditAction.UPDATE,
            entity_type: audit_enums_1.AuditEntityType.MAINTENANCE_CONFIGURATION,
            entity_id: config.id ?? null,
            old_values: oldValues,
            new_values: (0, audit_context_1.toSnapshot)(config),
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return config;
    }
};
exports.MaintenanceConfigurationService = MaintenanceConfigurationService;
exports.MaintenanceConfigurationService = MaintenanceConfigurationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource,
        organization_context_service_1.OrganizationContextService,
        audit_service_1.AuditService])
], MaintenanceConfigurationService);
//# sourceMappingURL=maintenance-configuration.service.js.map