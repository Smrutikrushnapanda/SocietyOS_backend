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
exports.VisitorApprovalService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const visitor_approval_entity_1 = require("../database/entities/visitor-approval.entity");
const visitor_visit_entity_1 = require("../database/entities/visitor-visit.entity");
const organization_context_service_1 = require("../organization/organization-context.service");
const audit_service_1 = require("../audit/audit.service");
const audit_enums_1 = require("../audit/audit.enums");
const audit_context_1 = require("../audit/audit-context");
let VisitorApprovalService = class VisitorApprovalService {
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
    async createVisitorApproval(createVisitorApprovalDto) {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const visitRepository = this.dataSource.getRepository(visitor_visit_entity_1.VisitorVisit);
        const visitorVisit = await visitRepository.findOneBy({
            id: createVisitorApprovalDto.visitor_visit_id,
            organization_id: createVisitorApprovalDto.organization_id,
        });
        if (!visitorVisit) {
            throw new common_1.ForbiddenException('Visitor visit not found or access denied');
        }
        const validStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
        if (!validStatuses.includes(createVisitorApprovalDto.approval_status)) {
            throw new common_1.ForbiddenException('Invalid approval status');
        }
        const visitorApproval = this.dataSource
            .getRepository(visitor_approval_entity_1.VisitorApproval)
            .create({
            organization_id: createVisitorApprovalDto.organization_id,
            visitor_visit_id: createVisitorApprovalDto.visitor_visit_id,
            approval_status: createVisitorApprovalDto.approval_status,
            approver_id: createVisitorApprovalDto.approver_id,
            approved_at: createVisitorApprovalDto.approved_at
                ? new Date(createVisitorApprovalDto.approved_at)
                : undefined,
            rejected_at: createVisitorApprovalDto.rejected_at
                ? new Date(createVisitorApprovalDto.rejected_at)
                : undefined,
        });
        await this.dataSource.getRepository(visitor_approval_entity_1.VisitorApproval).save(visitorApproval);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: visitorApproval.organization_id,
            }),
            action: audit_enums_1.AuditAction.CREATE,
            entity_type: audit_enums_1.AuditEntityType.VISITOR_APPROVAL,
            entity_id: visitorApproval.id ?? null,
            old_values: null,
            new_values: (0, audit_context_1.toSnapshot)(visitorApproval),
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return visitorApproval;
    }
    async findAll() {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const query = this.dataSource
            .getRepository(visitor_approval_entity_1.VisitorApproval)
            .createQueryBuilder('visitor_approval');
        if (!orgContext.isSuperAdmin && orgContext.organization_id) {
            query.where('visitor_approval.organization_id = :orgId', {
                orgId: orgContext.organization_id,
            });
        }
        return query.getMany();
    }
    async findOne(id) {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const visitorApproval = await this.dataSource
            .getRepository(visitor_approval_entity_1.VisitorApproval)
            .findOneBy({
            id,
            organization_id: orgContext.isSuperAdmin && orgContext.targetOrganizationId
                ? orgContext.targetOrganizationId
                : orgContext.organization_id,
        });
        if (!visitorApproval) {
            throw new common_1.ForbiddenException('Visitor approval not found or access denied');
        }
        return visitorApproval;
    }
    async update(id, updateVisitorApprovalDto) {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const visitorApproval = await this.dataSource
            .getRepository(visitor_approval_entity_1.VisitorApproval)
            .findOneBy({
            id,
            organization_id: orgContext.isSuperAdmin && orgContext.targetOrganizationId
                ? orgContext.targetOrganizationId
                : orgContext.organization_id,
        });
        if (!visitorApproval) {
            throw new common_1.ForbiddenException('Visitor approval not found or access denied');
        }
        if (!orgContext.isSuperAdmin) {
            if (visitorApproval.organization_id !== orgContext.organization_id) {
                throw new common_1.ForbiddenException('You can only update visitor approvals in your organization');
            }
        }
        const oldValues = (0, audit_context_1.toSnapshot)(visitorApproval);
        if (updateVisitorApprovalDto.approval_status) {
            const validStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
            if (!validStatuses.includes(updateVisitorApprovalDto.approval_status)) {
                throw new common_1.ForbiddenException('Invalid approval status');
            }
            visitorApproval.approval_status =
                updateVisitorApprovalDto.approval_status;
        }
        if (updateVisitorApprovalDto.approved_at !== undefined) {
            visitorApproval.approved_at = updateVisitorApprovalDto.approved_at
                ? new Date(updateVisitorApprovalDto.approved_at)
                : null;
        }
        if (updateVisitorApprovalDto.rejected_at !== undefined) {
            visitorApproval.rejected_at = updateVisitorApprovalDto.rejected_at
                ? new Date(updateVisitorApprovalDto.rejected_at)
                : null;
        }
        await this.dataSource.getRepository(visitor_approval_entity_1.VisitorApproval).save(visitorApproval);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: visitorApproval.organization_id,
            }),
            action: audit_enums_1.AuditAction.UPDATE,
            entity_type: audit_enums_1.AuditEntityType.VISITOR_APPROVAL,
            entity_id: visitorApproval.id ?? null,
            old_values: oldValues,
            new_values: (0, audit_context_1.toSnapshot)(visitorApproval),
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return visitorApproval;
    }
    async remove(id) {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const visitorApproval = await this.dataSource
            .getRepository(visitor_approval_entity_1.VisitorApproval)
            .findOneBy({
            id,
            organization_id: orgContext.isSuperAdmin && orgContext.targetOrganizationId
                ? orgContext.targetOrganizationId
                : orgContext.organization_id,
        });
        if (!visitorApproval) {
            throw new common_1.ForbiddenException('Visitor approval not found or access denied');
        }
        if (!orgContext.isSuperAdmin) {
            if (visitorApproval.organization_id !== orgContext.organization_id) {
                throw new common_1.ForbiddenException('You can only reject visitor approvals in your organization');
            }
        }
        const oldValues = (0, audit_context_1.toSnapshot)(visitorApproval);
        visitorApproval.approval_status = 'REJECTED';
        visitorApproval.rejected_at = new Date();
        await this.dataSource.getRepository(visitor_approval_entity_1.VisitorApproval).save(visitorApproval);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: visitorApproval.organization_id,
            }),
            action: audit_enums_1.AuditAction.REJECT,
            entity_type: audit_enums_1.AuditEntityType.VISITOR_APPROVAL,
            entity_id: visitorApproval.id ?? null,
            old_values: oldValues,
            new_values: null,
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return visitorApproval;
    }
};
exports.VisitorApprovalService = VisitorApprovalService;
exports.VisitorApprovalService = VisitorApprovalService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource,
        organization_context_service_1.OrganizationContextService,
        audit_service_1.AuditService])
], VisitorApprovalService);
//# sourceMappingURL=visitor-approval.service.js.map