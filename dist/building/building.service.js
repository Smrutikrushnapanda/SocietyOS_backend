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
exports.BuildingService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const building_entity_1 = require("../database/entities/building.entity");
const organization_context_service_1 = require("../organization/organization-context.service");
const audit_service_1 = require("../audit/audit.service");
const audit_enums_1 = require("../audit/audit.enums");
const audit_context_1 = require("../audit/audit-context");
let BuildingService = class BuildingService {
    dataSource;
    organizationContextService;
    auditService;
    constructor(dataSource, organizationContextService, auditService) {
        this.dataSource = dataSource;
        this.organizationContextService = organizationContextService;
        this.auditService = auditService;
    }
    async create(createBuildingDto) {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        if (orgContext.isSuperAdmin) {
            if (createBuildingDto.organization_id &&
                orgContext.targetOrganizationId) {
                if (createBuildingDto.organization_id !== orgContext.targetOrganizationId) {
                    throw new common_1.ForbiddenException('SUPER_ADMIN must create building in target organization');
                }
            }
        }
        else {
            if (orgContext.organization_id &&
                createBuildingDto.organization_id !== orgContext.organization_id) {
                throw new common_1.ForbiddenException('You can only create buildings in your organization');
            }
        }
        const building = this.dataSource.getRepository(building_entity_1.Building).create({
            id: '00000000-0000-0000-0000-000000000000',
            organization_id: createBuildingDto.organization_id,
            name: createBuildingDto.name,
            code: createBuildingDto.code,
            totalFloors: createBuildingDto.totalFloors,
            isActive: true,
        });
        await this.dataSource.getRepository(building_entity_1.Building).save(building);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: building.organization_id,
            }),
            action: audit_enums_1.AuditAction.CREATE,
            entity_type: audit_enums_1.AuditEntityType.BUILDING,
            entity_id: building.id ?? null,
            old_values: null,
            new_values: (0, audit_context_1.toSnapshot)(building),
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return building;
    }
    async findAll() {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const query = this.dataSource
            .getRepository(building_entity_1.Building)
            .createQueryBuilder('building');
        if (!orgContext.isSuperAdmin && orgContext.organization_id) {
            query.where('building.organization_id = :orgId', {
                orgId: orgContext.organization_id,
            });
        }
        return query.getMany();
    }
    async findOne(id) {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const building = await this.dataSource.getRepository(building_entity_1.Building).findOneBy({
            id,
            organization_id: orgContext.isSuperAdmin && orgContext.targetOrganizationId
                ? orgContext.targetOrganizationId
                : orgContext.organization_id,
        });
        if (!building) {
            throw new common_1.ForbiddenException('Building not found or access denied');
        }
        return building;
    }
    async update(id, updateBuildingDto) {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const building = await this.dataSource.getRepository(building_entity_1.Building).findOneBy({
            id,
            organization_id: orgContext.isSuperAdmin && orgContext.targetOrganizationId
                ? orgContext.targetOrganizationId
                : orgContext.organization_id,
        });
        if (!building) {
            throw new common_1.ForbiddenException('Building not found or access denied');
        }
        if (!orgContext.isSuperAdmin) {
            if (building.organization_id !== orgContext.organization_id) {
                throw new common_1.ForbiddenException('You can only update buildings in your organization');
            }
        }
        const oldValues = (0, audit_context_1.toSnapshot)(building);
        Object.assign(building, updateBuildingDto);
        await this.dataSource.getRepository(building_entity_1.Building).save(building);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: building.organization_id,
            }),
            action: audit_enums_1.AuditAction.UPDATE,
            entity_type: audit_enums_1.AuditEntityType.BUILDING,
            entity_id: building.id ?? null,
            old_values: oldValues,
            new_values: (0, audit_context_1.toSnapshot)(building),
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return building;
    }
    async remove(id) {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const building = await this.dataSource.getRepository(building_entity_1.Building).findOneBy({
            id,
            organization_id: orgContext.isSuperAdmin && orgContext.targetOrganizationId
                ? orgContext.targetOrganizationId
                : orgContext.organization_id,
        });
        if (!building) {
            throw new common_1.ForbiddenException('Building not found or access denied');
        }
        const oldValues = (0, audit_context_1.toSnapshot)(building);
        building.isActive = false;
        await this.dataSource.getRepository(building_entity_1.Building).save(building);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: building.organization_id,
            }),
            action: audit_enums_1.AuditAction.DELETE,
            entity_type: audit_enums_1.AuditEntityType.BUILDING,
            entity_id: building.id ?? null,
            old_values: oldValues,
            new_values: null,
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return building;
    }
};
exports.BuildingService = BuildingService;
exports.BuildingService = BuildingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource,
        organization_context_service_1.OrganizationContextService,
        audit_service_1.AuditService])
], BuildingService);
//# sourceMappingURL=building.service.js.map