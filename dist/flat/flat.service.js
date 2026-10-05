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
exports.FlatService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const flat_entity_1 = require("../database/entities/flat.entity");
const organization_context_service_1 = require("../organization/organization-context.service");
const audit_service_1 = require("../audit/audit.service");
const audit_enums_1 = require("../audit/audit.enums");
const audit_context_1 = require("../audit/audit-context");
let FlatService = class FlatService {
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
    async create(createFlatDto) {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const floor = await this.dataSource.getRepository('Floor').findOneBy({
            id: createFlatDto.floor_id,
            organization_id: createFlatDto.organization_id,
            building_id: createFlatDto.building_id,
        });
        if (!floor) {
            throw new common_1.ForbiddenException('Floor not found or access denied');
        }
        const building = await this.dataSource.getRepository('Building').findOneBy({
            id: createFlatDto.building_id,
            organization_id: createFlatDto.organization_id,
        });
        if (!building) {
            throw new common_1.ForbiddenException('Building not found or access denied');
        }
        const existingFlat = await this.dataSource.getRepository(flat_entity_1.Flat).findOneBy({
            organization_id: createFlatDto.organization_id,
            building_id: createFlatDto.building_id,
            flat_identifier: createFlatDto.flat_identifier,
        });
        if (existingFlat) {
            throw new common_1.ForbiddenException('Flat identifier must be unique within organization/building');
        }
        const flat = this.dataSource.getRepository(flat_entity_1.Flat).create({
            id: '00000000-0000-0000-0000-000000000000',
            organization_id: createFlatDto.organization_id,
            building_id: createFlatDto.building_id,
            floor_id: createFlatDto.floor_id,
            flat_identifier: createFlatDto.flat_identifier,
            flat_type: createFlatDto.flat_type,
            maintenance_multiplier: createFlatDto.maintenance_multiplier ?? 1.0,
            isActive: true,
        });
        await this.dataSource.getRepository(flat_entity_1.Flat).save(flat);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: flat.organization_id,
            }),
            action: audit_enums_1.AuditAction.CREATE,
            entity_type: audit_enums_1.AuditEntityType.FLAT,
            entity_id: flat.id ?? null,
            old_values: null,
            new_values: (0, audit_context_1.toSnapshot)(flat),
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return flat;
    }
    async findAll() {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const query = this.dataSource
            .getRepository(flat_entity_1.Flat)
            .createQueryBuilder('flat');
        if (!orgContext.isSuperAdmin && orgContext.organization_id) {
            query.where('flat.organization_id = :orgId', {
                orgId: orgContext.organization_id,
            });
        }
        else {
            query.where('1 = 0');
        }
        return query.getMany();
    }
    async findAllByBuilding(buildingId) {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const query = this.dataSource
            .getRepository(flat_entity_1.Flat)
            .createQueryBuilder('flat');
        query.where('flat.building_id = :buildingId', { buildingId });
        if (!orgContext.isSuperAdmin && orgContext.organization_id) {
            query.andWhere('flat.organization_id = :orgId', {
                orgId: orgContext.organization_id,
            });
        }
        return query.getMany();
    }
    async findOne(id) {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const flat = await this.dataSource.getRepository(flat_entity_1.Flat).findOneBy({
            id,
            organization_id: orgContext.isSuperAdmin && orgContext.targetOrganizationId
                ? orgContext.targetOrganizationId
                : orgContext.organization_id,
        });
        if (!flat) {
            throw new common_1.ForbiddenException('Flat not found or access denied');
        }
        return flat;
    }
    async update(id, updateFlatDto) {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const flat = await this.dataSource.getRepository(flat_entity_1.Flat).findOneBy({
            id,
            organization_id: orgContext.isSuperAdmin && orgContext.targetOrganizationId
                ? orgContext.targetOrganizationId
                : orgContext.organization_id,
        });
        if (!flat) {
            throw new common_1.ForbiddenException('Flat not found or access denied');
        }
        if (!orgContext.isSuperAdmin) {
            if (flat.organization_id !== orgContext.organization_id) {
                throw new common_1.ForbiddenException('You can only update flats in your organization');
            }
        }
        const oldValues = (0, audit_context_1.toSnapshot)(flat);
        Object.assign(flat, updateFlatDto);
        await this.dataSource.getRepository(flat_entity_1.Flat).save(flat);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: flat.organization_id,
            }),
            action: audit_enums_1.AuditAction.UPDATE,
            entity_type: audit_enums_1.AuditEntityType.FLAT,
            entity_id: flat.id ?? null,
            old_values: oldValues,
            new_values: (0, audit_context_1.toSnapshot)(flat),
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return flat;
    }
    async remove(id) {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const flat = await this.dataSource.getRepository(flat_entity_1.Flat).findOneBy({
            id,
            organization_id: orgContext.isSuperAdmin && orgContext.targetOrganizationId
                ? orgContext.targetOrganizationId
                : orgContext.organization_id,
        });
        if (!flat) {
            throw new common_1.ForbiddenException('Flat not found or access denied');
        }
        const oldValues = (0, audit_context_1.toSnapshot)(flat);
        flat.isActive = false;
        await this.dataSource.getRepository(flat_entity_1.Flat).save(flat);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: flat.organization_id,
            }),
            action: audit_enums_1.AuditAction.DELETE,
            entity_type: audit_enums_1.AuditEntityType.FLAT,
            entity_id: flat.id ?? null,
            old_values: oldValues,
            new_values: null,
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return flat;
    }
};
exports.FlatService = FlatService;
exports.FlatService = FlatService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource,
        organization_context_service_1.OrganizationContextService,
        audit_service_1.AuditService])
], FlatService);
//# sourceMappingURL=flat.service.js.map