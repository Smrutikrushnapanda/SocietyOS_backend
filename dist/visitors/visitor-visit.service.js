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
exports.VisitorVisitService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const visitor_visit_entity_1 = require("../database/entities/visitor-visit.entity");
const visitor_entity_1 = require("../database/entities/visitor.entity");
const organization_context_service_1 = require("../organization/organization-context.service");
const audit_service_1 = require("../audit/audit.service");
const audit_enums_1 = require("../audit/audit.enums");
const audit_context_1 = require("../audit/audit-context");
let VisitorVisitService = class VisitorVisitService {
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
    async createVisitorVisit(createVisitorVisitDto) {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const visitorRepository = this.dataSource.getRepository(visitor_entity_1.Visitor);
        const visitor = await visitorRepository.findOneBy({
            id: createVisitorVisitDto.visitor_id,
            organization_id: createVisitorVisitDto.organization_id,
        });
        if (!visitor) {
            throw new common_1.ForbiddenException('Visitor not found or access denied');
        }
        const validStatuses = [
            'PENDING',
            'CONFIRMED',
            'COMPLETED',
            'CANCELLED',
            'EXPIRED',
        ];
        if (!validStatuses.includes(createVisitorVisitDto.visit_status)) {
            throw new common_1.ForbiddenException('Invalid visit status');
        }
        const expectedEntryTime = createVisitorVisitDto.expected_entry_time
            ? new Date(createVisitorVisitDto.expected_entry_time)
            : undefined;
        const visitorVisit = this.dataSource.getRepository(visitor_visit_entity_1.VisitorVisit).create({
            organization_id: createVisitorVisitDto.organization_id,
            visitor_id: createVisitorVisitDto.visitor_id,
            visit_status: createVisitorVisitDto.visit_status,
            visit_purpose: createVisitorVisitDto.visit_purpose,
            expected_entry_time: expectedEntryTime,
        });
        await this.dataSource.getRepository(visitor_visit_entity_1.VisitorVisit).save(visitorVisit);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: visitorVisit.organization_id,
            }),
            action: audit_enums_1.AuditAction.CREATE,
            entity_type: audit_enums_1.AuditEntityType.VISITOR_VISIT,
            entity_id: visitorVisit.id ?? null,
            old_values: null,
            new_values: (0, audit_context_1.toSnapshot)(visitorVisit),
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return visitorVisit;
    }
    async findAll() {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const query = this.dataSource
            .getRepository(visitor_visit_entity_1.VisitorVisit)
            .createQueryBuilder('visitor_visit');
        if (!orgContext.isSuperAdmin && orgContext.organization_id) {
            query.where('visitor_visit.organization_id = :orgId', {
                orgId: orgContext.organization_id,
            });
        }
        return query.getMany();
    }
    async findOne(id) {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const visitorVisit = await this.dataSource
            .getRepository(visitor_visit_entity_1.VisitorVisit)
            .findOneBy({
            id,
            organization_id: orgContext.isSuperAdmin && orgContext.targetOrganizationId
                ? orgContext.targetOrganizationId
                : orgContext.organization_id,
        });
        if (!visitorVisit) {
            throw new common_1.ForbiddenException('Visitor visit not found or access denied');
        }
        return visitorVisit;
    }
    async update(id, updateVisitorVisitDto) {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const visitorVisit = await this.dataSource
            .getRepository(visitor_visit_entity_1.VisitorVisit)
            .findOneBy({
            id,
            organization_id: orgContext.isSuperAdmin && orgContext.targetOrganizationId
                ? orgContext.targetOrganizationId
                : orgContext.organization_id,
        });
        if (!visitorVisit) {
            throw new common_1.ForbiddenException('Visitor visit not found or access denied');
        }
        if (!orgContext.isSuperAdmin) {
            if (visitorVisit.organization_id !== orgContext.organization_id) {
                throw new common_1.ForbiddenException('You can only update visitor visits in your organization');
            }
        }
        const oldValues = (0, audit_context_1.toSnapshot)(visitorVisit);
        if (updateVisitorVisitDto.visit_status) {
            const validStatuses = [
                'PENDING',
                'CONFIRMED',
                'COMPLETED',
                'CANCELLED',
                'EXPIRED',
            ];
            if (!validStatuses.includes(updateVisitorVisitDto.visit_status)) {
                throw new common_1.ForbiddenException('Invalid visit status');
            }
            visitorVisit.visit_status = updateVisitorVisitDto.visit_status;
        }
        if (updateVisitorVisitDto.visit_purpose) {
            visitorVisit.visit_purpose = updateVisitorVisitDto.visit_purpose;
        }
        if (updateVisitorVisitDto.expected_entry_time) {
            visitorVisit.expected_entry_time =
                updateVisitorVisitDto.expected_entry_time
                    ? new Date(updateVisitorVisitDto.expected_entry_time)
                    : null;
        }
        await this.dataSource.getRepository(visitor_visit_entity_1.VisitorVisit).save(visitorVisit);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: visitorVisit.organization_id,
            }),
            action: audit_enums_1.AuditAction.UPDATE,
            entity_type: audit_enums_1.AuditEntityType.VISITOR_VISIT,
            entity_id: visitorVisit.id ?? null,
            old_values: oldValues,
            new_values: (0, audit_context_1.toSnapshot)(visitorVisit),
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return visitorVisit;
    }
    async remove(id) {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const visitorVisit = await this.dataSource
            .getRepository(visitor_visit_entity_1.VisitorVisit)
            .findOneBy({
            id,
            organization_id: orgContext.isSuperAdmin && orgContext.targetOrganizationId
                ? orgContext.targetOrganizationId
                : orgContext.organization_id,
        });
        if (!visitorVisit) {
            throw new common_1.ForbiddenException('Visitor visit not found or access denied');
        }
        if (!orgContext.isSuperAdmin) {
            if (visitorVisit.organization_id !== orgContext.organization_id) {
                throw new common_1.ForbiddenException('You can only cancel visitor visits in your organization');
            }
        }
        const oldValues = (0, audit_context_1.toSnapshot)(visitorVisit);
        visitorVisit.visit_status = 'CANCELLED';
        await this.dataSource.getRepository(visitor_visit_entity_1.VisitorVisit).save(visitorVisit);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: visitorVisit.organization_id,
            }),
            action: audit_enums_1.AuditAction.CANCEL,
            entity_type: audit_enums_1.AuditEntityType.VISITOR_VISIT,
            entity_id: visitorVisit.id ?? null,
            old_values: oldValues,
            new_values: null,
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return visitorVisit;
    }
};
exports.VisitorVisitService = VisitorVisitService;
exports.VisitorVisitService = VisitorVisitService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource,
        organization_context_service_1.OrganizationContextService,
        audit_service_1.AuditService])
], VisitorVisitService);
//# sourceMappingURL=visitor-visit.service.js.map