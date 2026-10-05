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
exports.VisitorService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const visitor_entity_1 = require("../database/entities/visitor.entity");
const organization_context_service_1 = require("../organization/organization-context.service");
const audit_service_1 = require("../audit/audit.service");
const audit_enums_1 = require("../audit/audit.enums");
const audit_context_1 = require("../audit/audit-context");
let VisitorService = class VisitorService {
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
    async createVisitor(createVisitorDto) {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        if (!orgContext.isSuperAdmin &&
            orgContext.organization_id &&
            createVisitorDto.organization_id !== orgContext.organization_id) {
            throw new common_1.ForbiddenException('You can only create visitors in your organization');
        }
        const visitor = this.dataSource.getRepository(visitor_entity_1.Visitor).create({
            id: '00000000-0000-0000-0000-000000000000',
            organization_id: createVisitorDto.organization_id,
            name: createVisitorDto.name,
            mobile: createVisitorDto.mobile,
            active: createVisitorDto.active !== false,
        });
        await this.dataSource.getRepository(visitor_entity_1.Visitor).save(visitor);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: visitor.organization_id,
            }),
            action: audit_enums_1.AuditAction.CREATE,
            entity_type: audit_enums_1.AuditEntityType.VISITOR,
            entity_id: visitor.id ?? null,
            old_values: null,
            new_values: (0, audit_context_1.toSnapshot)(visitor),
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return visitor;
    }
    async findAll() {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const query = this.dataSource
            .getRepository(visitor_entity_1.Visitor)
            .createQueryBuilder('visitor');
        if (!orgContext.isSuperAdmin && orgContext.organization_id) {
            query.where('visitor.organization_id = :orgId', {
                orgId: orgContext.organization_id,
            });
        }
        return query.getMany();
    }
    async findOne(id) {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const visitor = await this.dataSource.getRepository(visitor_entity_1.Visitor).findOneBy({
            id,
            organization_id: orgContext.isSuperAdmin && orgContext.targetOrganizationId
                ? orgContext.targetOrganizationId
                : orgContext.organization_id,
        });
        if (!visitor) {
            throw new common_1.ForbiddenException('Visitor not found or access denied');
        }
        return visitor;
    }
    async update(id, updateVisitorDto) {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const visitor = await this.dataSource.getRepository(visitor_entity_1.Visitor).findOneBy({
            id,
            organization_id: orgContext.isSuperAdmin && orgContext.targetOrganizationId
                ? orgContext.targetOrganizationId
                : orgContext.organization_id,
        });
        if (!visitor) {
            throw new common_1.ForbiddenException('Visitor not found or access denied');
        }
        if (!orgContext.isSuperAdmin) {
            if (visitor.organization_id !== orgContext.organization_id) {
                throw new common_1.ForbiddenException('You can only update visitors in your organization');
            }
        }
        const oldValues = (0, audit_context_1.toSnapshot)(visitor);
        if (updateVisitorDto.name) {
            visitor.name = updateVisitorDto.name;
        }
        if (updateVisitorDto.mobile) {
            visitor.mobile = updateVisitorDto.mobile;
        }
        if (updateVisitorDto.active !== undefined) {
            visitor.active = updateVisitorDto.active;
        }
        await this.dataSource.getRepository(visitor_entity_1.Visitor).save(visitor);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: visitor.organization_id,
            }),
            action: audit_enums_1.AuditAction.UPDATE,
            entity_type: audit_enums_1.AuditEntityType.VISITOR,
            entity_id: visitor.id ?? null,
            old_values: oldValues,
            new_values: (0, audit_context_1.toSnapshot)(visitor),
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return visitor;
    }
    async remove(id) {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const visitor = await this.dataSource.getRepository(visitor_entity_1.Visitor).findOneBy({
            id,
            organization_id: orgContext.isSuperAdmin && orgContext.targetOrganizationId
                ? orgContext.targetOrganizationId
                : orgContext.organization_id,
        });
        if (!visitor) {
            throw new common_1.ForbiddenException('Visitor not found or access denied');
        }
        if (!orgContext.isSuperAdmin) {
            if (visitor.organization_id !== orgContext.organization_id) {
                throw new common_1.ForbiddenException('You can only deactivate visitors in your organization');
            }
        }
        const oldValues = (0, audit_context_1.toSnapshot)(visitor);
        visitor.active = false;
        await this.dataSource.getRepository(visitor_entity_1.Visitor).save(visitor);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: visitor.organization_id,
            }),
            action: audit_enums_1.AuditAction.DELETE,
            entity_type: audit_enums_1.AuditEntityType.VISITOR,
            entity_id: visitor.id ?? null,
            old_values: oldValues,
            new_values: null,
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return visitor;
    }
};
exports.VisitorService = VisitorService;
exports.VisitorService = VisitorService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource,
        organization_context_service_1.OrganizationContextService,
        audit_service_1.AuditService])
], VisitorService);
//# sourceMappingURL=visitor.service.js.map