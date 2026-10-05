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
exports.ComplaintService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const complaint_entity_1 = require("../database/entities/complaint.entity");
const complaint_status_history_entity_1 = require("../database/entities/complaint-status-history.entity");
const audit_service_1 = require("../audit/audit.service");
const audit_enums_1 = require("../audit/audit.enums");
const audit_context_1 = require("../audit/audit-context");
let ComplaintService = class ComplaintService {
    dataSource;
    auditService;
    constructor(dataSource, auditService) {
        this.dataSource = dataSource;
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
    async create(createDto, authenticatedResidentId, orgContext) {
        if (createDto.resident_id !== authenticatedResidentId) {
            throw new common_1.ForbiddenException('Residents can only create complaints for themselves');
        }
        const orgId = orgContext?.organizationId;
        const complaint = this.dataSource
            .getRepository(complaint_entity_1.Complaint)
            .create({
            id: createDto.id,
            organization_id: orgId,
            resident_id: createDto.resident_id,
            flat_id: createDto.flat_id,
            category: createDto.category,
            subject: createDto.subject,
            description: createDto.description,
            status: 'OPEN',
            priority: createDto.priority || 'MEDIUM',
            assigned_to: createDto.assigned_to,
            resolved_at: null,
            created_at: new Date(),
            updated_at: new Date,
        });
        const saved = await this.dataSource.getRepository(complaint_entity_1.Complaint).save(complaint);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: saved.organization_id,
            }),
            action: audit_enums_1.AuditAction.CREATE,
            entity_type: audit_enums_1.AuditEntityType.COMPLAINT,
            entity_id: saved.id ?? null,
            old_values: null,
            new_values: (0, audit_context_1.toSnapshot)(saved),
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return saved;
    }
    async findAll(orgContext) {
        const orgId = orgContext.organizationId;
        return this.dataSource
            .getRepository(complaint_entity_1.Complaint)
            .find({ where: { organization_id: orgId } });
    }
    async findOne(id, orgContext) {
        const orgId = orgContext.organizationId;
        return this.dataSource
            .getRepository(complaint_entity_1.Complaint)
            .findOne({ where: { id, organization_id: orgId } });
    }
    async update(id, updateDto, orgContext) {
        const orgId = orgContext.organizationId;
        const complaint = await this.findOne(id, orgContext);
        if (!complaint)
            return null;
        const oldValues = (0, audit_context_1.toSnapshot)(complaint);
        if (updateDto.status)
            complaint.status = updateDto.status;
        if (updateDto.priority)
            complaint.priority = updateDto.priority;
        if (updateDto.assigned_to)
            complaint.assigned_to = updateDto.assigned_to;
        complaint.updated_at = new Date();
        const saved = await this.dataSource.getRepository(complaint_entity_1.Complaint).save(complaint);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: saved.organization_id,
            }),
            action: audit_enums_1.AuditAction.UPDATE,
            entity_type: audit_enums_1.AuditEntityType.COMPLAINT,
            entity_id: saved.id ?? null,
            old_values: oldValues,
            new_values: (0, audit_context_1.toSnapshot)(saved),
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return saved;
    }
    async assign(id, assignedTo, orgContext) {
        const orgId = orgContext.organizationId;
        const complaint = await this.findOne(id, orgContext);
        if (!complaint)
            return null;
        const oldValues = (0, audit_context_1.toSnapshot)(complaint);
        complaint.assigned_to = assignedTo;
        complaint.updated_at = new Date();
        const saved = await this.dataSource.getRepository(complaint_entity_1.Complaint).save(complaint);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: saved.organization_id,
            }),
            action: audit_enums_1.AuditAction.ASSIGN,
            entity_type: audit_enums_1.AuditEntityType.COMPLAINT,
            entity_id: saved.id ?? null,
            old_values: oldValues,
            new_values: (0, audit_context_1.toSnapshot)(saved),
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return saved;
    }
    async resolve(id, reason, orgContext) {
        const orgId = orgContext.organizationId;
        const complaint = await this.findOne(id, orgContext);
        if (!complaint)
            return null;
        const allowedTransitions = {
            OPEN: ['IN_PROGRESS', 'REJECTED'],
            IN_PROGRESS: ['RESOLVED'],
            RESOLVED: ['CLOSED'],
        };
        const currentStatus = complaint.status;
        const allowedNext = allowedTransitions[currentStatus];
        if (!allowedNext) {
            throw new common_1.ForbiddenException(`No further transitions from status ${currentStatus}`);
        }
        const oldValues = (0, audit_context_1.toSnapshot)(complaint);
        const newStatus = allowedNext[0];
        complaint.status = newStatus;
        complaint.updated_at = new Date;
        await this.dataSource.getRepository(complaint_status_history_entity_1.ComplaintStatusHistory).save({
            id: complaint.id,
            complaint_id: complaint.id,
            previous_status: complaint.status,
            new_status: newStatus,
            changed_by: '',
            changed_at: new Date(),
            reason,
        });
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: complaint.organization_id,
            }),
            action: audit_enums_1.AuditAction.RESOLVE,
            entity_type: audit_enums_1.AuditEntityType.COMPLAINT,
            entity_id: complaint.id ?? null,
            old_values: oldValues,
            new_values: (0, audit_context_1.toSnapshot)(complaint),
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return complaint;
    }
};
exports.ComplaintService = ComplaintService;
exports.ComplaintService = ComplaintService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource,
        audit_service_1.AuditService])
], ComplaintService);
//# sourceMappingURL=complaint.service.js.map