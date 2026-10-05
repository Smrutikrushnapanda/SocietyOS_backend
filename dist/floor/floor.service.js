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
exports.FloorService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const floor_entity_1 = require("../database/entities/floor.entity");
const organization_context_service_1 = require("../organization/organization-context.service");
const audit_service_1 = require("../audit/audit.service");
const audit_enums_1 = require("../audit/audit.enums");
const audit_context_1 = require("../audit/audit-context");
let FloorService = class FloorService {
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
    async create(createFloorDto) {
        const building = await this.dataSource.getRepository('Building').findOneBy({
            id: createFloorDto.building_id,
            organization_id: createFloorDto.organization_id,
        });
        if (!building) {
            throw new common_1.ForbiddenException('Building not found or access denied');
        }
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        if (!orgContext.isSuperAdmin && orgContext.organization_id) {
            if (building.organization_id !== orgContext.organization_id) {
                throw new common_1.ForbiddenException('You can only add floors to buildings in your organization');
            }
        }
        const existingFloor = await this.dataSource.getRepository(floor_entity_1.Floor).findOneBy({
            building_id: createFloorDto.building_id,
            floor_number: createFloorDto.floor_number,
        });
        if (existingFloor) {
            throw new common_1.ForbiddenException('Duplicate floor number within the same building');
        }
        const floor = this.dataSource.getRepository(floor_entity_1.Floor).create({
            id: '00000000-0000-0000-0000-000000000000',
            organization_id: createFloorDto.organization_id,
            building_id: createFloorDto.building_id,
            floor_number: createFloorDto.floor_number,
            name: createFloorDto.name,
            isActive: true,
        });
        await this.dataSource.getRepository(floor_entity_1.Floor).save(floor);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: floor.organization_id,
            }),
            action: audit_enums_1.AuditAction.CREATE,
            entity_type: audit_enums_1.AuditEntityType.FLOOR,
            entity_id: floor.id ?? null,
            old_values: null,
            new_values: (0, audit_context_1.toSnapshot)(floor),
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return floor;
    }
    async findAll() {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const query = this.dataSource
            .getRepository(floor_entity_1.Floor)
            .createQueryBuilder('floor');
        if (!orgContext.isSuperAdmin && orgContext.organization_id) {
            query.where('floor.organization_id = :orgId', {
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
            .getRepository(floor_entity_1.Floor)
            .createQueryBuilder('floor');
        query.where('floor.building_id = :buildingId', { buildingId });
        if (!orgContext.isSuperAdmin && orgContext.organization_id) {
            query.andWhere('floor.organization_id = :orgId', {
                orgId: orgContext.organization_id,
            });
        }
        return query.getMany();
    }
    async findOne(id) {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const floor = await this.dataSource.getRepository(floor_entity_1.Floor).findOneBy({
            id,
            organization_id: orgContext.isSuperAdmin && orgContext.targetOrganizationId
                ? orgContext.targetOrganizationId
                : orgContext.organization_id,
        });
        if (!floor) {
            throw new common_1.ForbiddenException('Floor not found or access denied');
        }
        return floor;
    }
    async update(id, updateFloorDto) {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const floor = await this.dataSource.getRepository(floor_entity_1.Floor).findOneBy({
            id,
            organization_id: orgContext.isSuperAdmin && orgContext.targetOrganizationId
                ? orgContext.targetOrganizationId
                : orgContext.organization_id,
        });
        if (!floor) {
            throw new common_1.ForbiddenException('Floor not found or access denied');
        }
        if (!orgContext.isSuperAdmin) {
            if (floor.organization_id !== orgContext.organization_id) {
                throw new common_1.ForbiddenException('You can only update floors in your organization');
            }
        }
        const oldFloorValues = (0, audit_context_1.toSnapshot)(floor);
        Object.assign(floor, updateFloorDto);
        await this.dataSource.getRepository(floor_entity_1.Floor).save(floor);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: floor.organization_id,
            }),
            action: audit_enums_1.AuditAction.UPDATE,
            entity_type: audit_enums_1.AuditEntityType.FLOOR,
            entity_id: floor.id ?? null,
            old_values: oldFloorValues,
            new_values: (0, audit_context_1.toSnapshot)(floor),
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return floor;
    }
    async remove(id) {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const floor = await this.dataSource.getRepository(floor_entity_1.Floor).findOneBy({
            id,
            organization_id: orgContext.isSuperAdmin && orgContext.targetOrganizationId
                ? orgContext.targetOrganizationId
                : orgContext.organization_id,
        });
        if (!floor) {
            throw new common_1.ForbiddenException('Floor not found or access denied');
        }
        const oldFloorDeleteValues = (0, audit_context_1.toSnapshot)(floor);
        floor.isActive = false;
        await this.dataSource.getRepository(floor_entity_1.Floor).save(floor);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: floor.organization_id,
            }),
            action: audit_enums_1.AuditAction.DELETE,
            entity_type: audit_enums_1.AuditEntityType.FLOOR,
            entity_id: floor.id ?? null,
            old_values: oldFloorDeleteValues,
            new_values: null,
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return floor;
    }
};
exports.FloorService = FloorService;
exports.FloorService = FloorService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource,
        organization_context_service_1.OrganizationContextService,
        audit_service_1.AuditService])
], FloorService);
//# sourceMappingURL=floor.service.js.map