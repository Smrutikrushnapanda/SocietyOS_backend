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
exports.VisitorPassService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const visitor_pass_entity_1 = require("../database/entities/visitor-pass.entity");
const visitor_entity_1 = require("../database/entities/visitor.entity");
const visitor_visit_entity_1 = require("../database/entities/visitor-visit.entity");
const organization_context_service_1 = require("../organization/organization-context.service");
const audit_service_1 = require("../audit/audit.service");
const audit_enums_1 = require("../audit/audit.enums");
const audit_context_1 = require("../audit/audit-context");
let VisitorPassService = class VisitorPassService {
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
    async createVisitorPass(createVisitorPassDto) {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const visitorRepository = this.dataSource.getRepository(visitor_entity_1.Visitor);
        const visitor = await visitorRepository.findOneBy({
            id: createVisitorPassDto.visitor_id,
            organization_id: createVisitorPassDto.organization_id,
        });
        if (!visitor) {
            throw new common_1.ForbiddenException('Visitor not found or access denied');
        }
        if (createVisitorPassDto.visitor_visit_id) {
            const visitRepository = this.dataSource.getRepository(visitor_visit_entity_1.VisitorVisit);
            const visitorVisit = await visitRepository.findOneBy({
                id: createVisitorPassDto.visitor_visit_id,
                organization_id: createVisitorPassDto.organization_id,
            });
            if (!visitorVisit) {
                throw new common_1.ForbiddenException('Visitor visit not found or access denied');
            }
        }
        const validStatuses = ['ACTIVE', 'EXPIRED', 'REVOKED'];
        if (!validStatuses.includes(createVisitorPassDto.pass_status)) {
            throw new common_1.ForbiddenException('Invalid pass status');
        }
        const start = new Date(createVisitorPassDto.validity_start);
        const end = new Date(createVisitorPassDto.validity_end);
        if (end <= start) {
            throw new common_1.ForbiddenException('Validity end must be after start');
        }
        const visitorPass = this.dataSource.getRepository(visitor_pass_entity_1.VisitorPass).create({
            organization_id: createVisitorPassDto.organization_id,
            visitor_id: createVisitorPassDto.visitor_id,
            visitor_visit_id: createVisitorPassDto.visitor_visit_id,
            issuer: createVisitorPassDto.issuer,
            pass_status: createVisitorPassDto.pass_status,
            validity_start: start,
            validity_end: end,
        });
        await this.dataSource.getRepository(visitor_pass_entity_1.VisitorPass).save(visitorPass);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: visitorPass.organization_id,
            }),
            action: audit_enums_1.AuditAction.CREATE,
            entity_type: audit_enums_1.AuditEntityType.VISITOR_PASS,
            entity_id: visitorPass.id ?? null,
            old_values: null,
            new_values: (0, audit_context_1.toSnapshot)(visitorPass),
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return visitorPass;
    }
    async findAll() {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const query = this.dataSource
            .getRepository(visitor_pass_entity_1.VisitorPass)
            .createQueryBuilder('visitor_pass');
        if (!orgContext.isSuperAdmin && orgContext.organization_id) {
            query.where('visitor_pass.organization_id = :orgId', {
                orgId: orgContext.organization_id,
            });
        }
        return query.getMany();
    }
    async findOne(id) {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const visitorPass = await this.dataSource
            .getRepository(visitor_pass_entity_1.VisitorPass)
            .findOneBy({
            id,
            organization_id: orgContext.isSuperAdmin && orgContext.targetOrganizationId
                ? orgContext.targetOrganizationId
                : orgContext.organization_id,
        });
        if (!visitorPass) {
            throw new common_1.ForbiddenException('Visitor pass not found or access denied');
        }
        return visitorPass;
    }
    async update(id, updateVisitorPassDto) {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const visitorPass = await this.dataSource
            .getRepository(visitor_pass_entity_1.VisitorPass)
            .findOneBy({
            id,
            organization_id: orgContext.isSuperAdmin && orgContext.targetOrganizationId
                ? orgContext.targetOrganizationId
                : orgContext.organization_id,
        });
        if (!visitorPass) {
            throw new common_1.ForbiddenException('Visitor pass not found or access denied');
        }
        if (!orgContext.isSuperAdmin) {
            if (visitorPass.organization_id !== orgContext.organization_id) {
                throw new common_1.ForbiddenException('You can only update visitor passes in your organization');
            }
        }
        const oldValues = (0, audit_context_1.toSnapshot)(visitorPass);
        if (updateVisitorPassDto.pass_status) {
            const validStatuses = ['ACTIVE', 'EXPIRED', 'REVOKED'];
            if (!validStatuses.includes(updateVisitorPassDto.pass_status)) {
                throw new common_1.ForbiddenException('Invalid pass status');
            }
            visitorPass.pass_status = updateVisitorPassDto.pass_status;
        }
        if (updateVisitorPassDto.validity_start) {
            visitorPass.validity_start = new Date(updateVisitorPassDto.validity_start);
        }
        if (updateVisitorPassDto.validity_end) {
            visitorPass.validity_end = new Date(updateVisitorPassDto.validity_end);
        }
        await this.dataSource.getRepository(visitor_pass_entity_1.VisitorPass).save(visitorPass);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: visitorPass.organization_id,
            }),
            action: audit_enums_1.AuditAction.UPDATE,
            entity_type: audit_enums_1.AuditEntityType.VISITOR_PASS,
            entity_id: visitorPass.id ?? null,
            old_values: oldValues,
            new_values: (0, audit_context_1.toSnapshot)(visitorPass),
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return visitorPass;
    }
    async remove(id) {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const visitorPass = await this.dataSource
            .getRepository(visitor_pass_entity_1.VisitorPass)
            .findOneBy({
            id,
            organization_id: orgContext.isSuperAdmin && orgContext.targetOrganizationId
                ? orgContext.targetOrganizationId
                : orgContext.organization_id,
        });
        if (!visitorPass) {
            throw new common_1.ForbiddenException('Visitor pass not found or access denied');
        }
        if (!orgContext.isSuperAdmin) {
            if (visitorPass.organization_id !== orgContext.organization_id) {
                throw new common_1.ForbiddenException('You can only revoke visitor passes in your organization');
            }
        }
        const oldValues = (0, audit_context_1.toSnapshot)(visitorPass);
        visitorPass.pass_status = 'REVOKED';
        await this.dataSource.getRepository(visitor_pass_entity_1.VisitorPass).save(visitorPass);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: visitorPass.organization_id,
            }),
            action: audit_enums_1.AuditAction.REVOKE,
            entity_type: audit_enums_1.AuditEntityType.VISITOR_PASS,
            entity_id: visitorPass.id ?? null,
            old_values: oldValues,
            new_values: null,
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return visitorPass;
    }
};
exports.VisitorPassService = VisitorPassService;
exports.VisitorPassService = VisitorPassService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource,
        organization_context_service_1.OrganizationContextService,
        audit_service_1.AuditService])
], VisitorPassService);
//# sourceMappingURL=visitor-pass.service.js.map