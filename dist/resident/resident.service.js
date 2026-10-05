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
exports.ResidentService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const resident_entity_1 = require("../database/entities/resident.entity");
const organization_context_service_1 = require("../organization/organization-context.service");
const audit_service_1 = require("../audit/audit.service");
const audit_enums_1 = require("../audit/audit.enums");
const audit_context_1 = require("../audit/audit-context");
let ResidentService = class ResidentService {
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
    async createResident(createResidentDto) {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const userRepository = this.dataSource.getRepository('User');
        const user = await userRepository.findOneBy({
            id: createResidentDto.user_id,
        });
        if (!user) {
            throw new common_1.ForbiddenException('User not found');
        }
        if (!orgContext.isSuperAdmin && orgContext.organization_id) {
            if (createResidentDto.organization_id !== orgContext.organization_id) {
                throw new common_1.ForbiddenException('You can only create residents in your organization');
            }
        }
        if (createResidentDto.flat_id) {
            const flat = await this.dataSource.getRepository('Flat').findOneBy({
                id: createResidentDto.flat_id,
                organization_id: createResidentDto.organization_id,
            });
            if (!flat) {
                throw new common_1.ForbiddenException('Flat not found or access denied');
            }
        }
        const resident = this.dataSource.getRepository(resident_entity_1.Resident).create({
            id: '00000000-0000-0000-0000-000000000000',
            user_id: createResidentDto.user_id,
            organization_id: createResidentDto.organization_id,
            flat_id: createResidentDto.flat_id,
            kyc_status: 'PENDING',
            isActive: true,
        });
        await this.dataSource.getRepository(resident_entity_1.Resident).save(resident);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: resident.organization_id,
            }),
            action: audit_enums_1.AuditAction.CREATE,
            entity_type: audit_enums_1.AuditEntityType.RESIDENT,
            entity_id: resident.id ?? null,
            old_values: null,
            new_values: (0, audit_context_1.toSnapshot)(resident),
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return resident;
    }
    async findAll() {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const query = this.dataSource
            .getRepository(resident_entity_1.Resident)
            .createQueryBuilder('resident');
        if (!orgContext.isSuperAdmin && orgContext.organization_id) {
            query.where('resident.organization_id = :orgId', {
                orgId: orgContext.organization_id,
            });
        }
        return query.getMany();
    }
    async findOne(id) {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const resident = await this.dataSource.getRepository(resident_entity_1.Resident).findOneBy({
            id,
            organization_id: orgContext.isSuperAdmin && orgContext.targetOrganizationId
                ? orgContext.targetOrganizationId
                : orgContext.organization_id,
        });
        if (!resident) {
            throw new common_1.ForbiddenException('Resident not found or access denied');
        }
        return resident;
    }
    async update(id, updateResidentDto) {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const resident = await this.dataSource.getRepository(resident_entity_1.Resident).findOneBy({
            id,
            organization_id: orgContext.isSuperAdmin && orgContext.targetOrganizationId
                ? orgContext.targetOrganizationId
                : orgContext.organization_id,
        });
        if (!resident) {
            throw new common_1.ForbiddenException('Resident not found or access denied');
        }
        if (!orgContext.isSuperAdmin) {
            if (resident.organization_id !== orgContext.organization_id) {
                throw new common_1.ForbiddenException('You can only update residents in your organization');
            }
        }
        const oldValues = (0, audit_context_1.toSnapshot)(resident);
        if (updateResidentDto.flat_id) {
            const flat = await this.dataSource.getRepository('Flat').findOneBy({
                id: updateResidentDto.flat_id,
                organization_id: resident.organization_id,
            });
            if (!flat) {
                throw new common_1.ForbiddenException('Flat not found or access denied');
            }
            resident.flat_id = updateResidentDto.flat_id;
        }
        if (updateResidentDto.kyc_status) {
            resident.kyc_status = updateResidentDto.kyc_status;
        }
        if (updateResidentDto.app_access_status !== undefined) {
            resident.app_access_status = updateResidentDto.app_access_status;
        }
        await this.dataSource.getRepository(resident_entity_1.Resident).save(resident);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: resident.organization_id,
            }),
            action: audit_enums_1.AuditAction.UPDATE,
            entity_type: audit_enums_1.AuditEntityType.RESIDENT,
            entity_id: resident.id ?? null,
            old_values: oldValues,
            new_values: (0, audit_context_1.toSnapshot)(resident),
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return resident;
    }
    async assignFlat(residentId, flatId) {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const resident = await this.dataSource.getRepository(resident_entity_1.Resident).findOneBy({
            id: residentId,
            organization_id: orgContext.isSuperAdmin && orgContext.targetOrganizationId
                ? orgContext.targetOrganizationId
                : orgContext.organization_id,
        });
        if (!resident) {
            throw new common_1.ForbiddenException('Resident not found or access denied');
        }
        const flat = await this.dataSource.getRepository('Flat').findOneBy({
            id: flatId,
            organization_id: orgContext.isSuperAdmin && orgContext.targetOrganizationId
                ? orgContext.targetOrganizationId
                : orgContext.organization_id,
        });
        if (!flat) {
            throw new common_1.ForbiddenException('Flat not found or access denied');
        }
        if (resident.organization_id !== flat.organization_id) {
            throw new common_1.ForbiddenException('Resident and flat must belong to the same organization');
        }
        const oldValues = (0, audit_context_1.toSnapshot)(resident);
        resident.flat_id = flatId;
        await this.dataSource.getRepository(resident_entity_1.Resident).save(resident);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: resident.organization_id,
            }),
            action: audit_enums_1.AuditAction.ASSIGN,
            entity_type: audit_enums_1.AuditEntityType.RESIDENT,
            entity_id: resident.id ?? null,
            old_values: oldValues,
            new_values: (0, audit_context_1.toSnapshot)(resident),
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return resident;
    }
    async assignAppAccess(residentId, appAccessStatus) {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const resident = await this.dataSource.getRepository(resident_entity_1.Resident).findOneBy({
            id: residentId,
            organization_id: orgContext.isSuperAdmin && orgContext.targetOrganizationId
                ? orgContext.targetOrganizationId
                : orgContext.organization_id,
        });
        if (!resident) {
            throw new common_1.ForbiddenException('Resident not found or access denied');
        }
        if (!orgContext.isSuperAdmin) {
            if (resident.organization_id !== orgContext.organization_id) {
                throw new common_1.ForbiddenException('You can only update app access for residents in your organization');
            }
        }
        const oldValues = (0, audit_context_1.toSnapshot)(resident);
        resident.app_access_status = appAccessStatus;
        await this.dataSource.getRepository(resident_entity_1.Resident).save(resident);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: resident.organization_id,
            }),
            action: audit_enums_1.AuditAction.UPDATE,
            entity_type: audit_enums_1.AuditEntityType.RESIDENT,
            entity_id: resident.id ?? null,
            old_values: oldValues,
            new_values: (0, audit_context_1.toSnapshot)(resident),
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return resident;
    }
};
exports.ResidentService = ResidentService;
exports.ResidentService = ResidentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource,
        organization_context_service_1.OrganizationContextService,
        audit_service_1.AuditService])
], ResidentService);
//# sourceMappingURL=resident.service.js.map