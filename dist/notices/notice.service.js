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
exports.NoticeService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const notice_entity_1 = require("../database/entities/notice.entity");
const audit_service_1 = require("../audit/audit.service");
const audit_enums_1 = require("../audit/audit.enums");
const audit_context_1 = require("../audit/audit-context");
let NoticeService = class NoticeService {
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
    async create(createDto, authenticatedUserId, orgContext) {
        const orgId = orgContext?.organizationId;
        const notice = this.dataSource
            .getRepository(notice_entity_1.Notice)
            .create({
            id: createDto.id,
            organization_id: orgId,
            title: createDto.title,
            content: createDto.content,
            status: 'DRAFT',
            published_at: null,
            expires_at: createDto.expires_at,
            created_by: authenticatedUserId,
            created_at: new Date(),
            updated_at: new Date,
        });
        const saved = await this.dataSource.getRepository(notice_entity_1.Notice).save(notice);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: saved.organization_id,
            }),
            action: audit_enums_1.AuditAction.CREATE,
            entity_type: audit_enums_1.AuditEntityType.NOTICE,
            entity_id: saved.id ?? null,
            old_values: null,
            new_values: (0, audit_context_1.toSnapshot)(saved),
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return saved;
    }
    async findAll(orgContext) {
        const orgId = orgContext.organizationId;
        const where = { organization_id: orgId };
        return this.dataSource.getRepository(notice_entity_1.Notice).find({ where });
    }
    async findOne(id, orgContext) {
        const orgId = orgContext.organizationId;
        return this.dataSource.getRepository(notice_entity_1.Notice).findOne({ where: { id, organization_id: orgId } });
    }
    async publish(id, orgContext) {
        const orgId = orgContext.organizationId;
        const notice = await this.findOne(id, orgContext);
        if (!notice)
            return null;
        if (notice.status !== 'DRAFT') {
            throw new common_1.ForbiddenException(`Invalid transition from ${notice.status} to PUBLISHED`);
        }
        const oldValues = (0, audit_context_1.toSnapshot)(notice);
        notice.status = 'PUBLISHED';
        notice.published_at = new Date();
        notice.updated_at = new Date;
        const saved = await this.dataSource.getRepository(notice_entity_1.Notice).save(notice);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: saved.organization_id,
            }),
            action: audit_enums_1.AuditAction.PUBLISH,
            entity_type: audit_enums_1.AuditEntityType.NOTICE,
            entity_id: saved.id ?? null,
            old_values: oldValues,
            new_values: (0, audit_context_1.toSnapshot)(saved),
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return saved;
    }
    async expire(id, orgContext) {
        const orgId = orgContext.organizationId;
        const notice = await this.findOne(id, orgContext);
        if (!notice)
            return null;
        if (notice.status !== 'PUBLISHED') {
            throw new common_1.ForbiddenException(`Invalid transition from ${notice.status} to ARCHIVED`);
        }
        const oldValues = (0, audit_context_1.toSnapshot)(notice);
        notice.status = 'ARCHIVED';
        notice.updated_at = new Date;
        const saved = await this.dataSource.getRepository(notice_entity_1.Notice).save(notice);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: saved.organization_id,
            }),
            action: audit_enums_1.AuditAction.EXPIRE,
            entity_type: audit_enums_1.AuditEntityType.NOTICE,
            entity_id: saved.id ?? null,
            old_values: oldValues,
            new_values: (0, audit_context_1.toSnapshot)(saved),
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return saved;
    }
    async archive(id, orgContext) {
        const orgId = orgContext.organizationId;
        const notice = await this.findOne(id, orgContext);
        if (!notice)
            return null;
        if (notice.status !== 'PUBLISHED') {
            throw new common_1.ForbiddenException(`Invalid transition from ${notice.status} to ARCHIVED`);
        }
        const oldValues = (0, audit_context_1.toSnapshot)(notice);
        notice.status = 'ARCHIVED';
        notice.updated_at = new Date;
        const saved = await this.dataSource.getRepository(notice_entity_1.Notice).save(notice);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: saved.organization_id,
            }),
            action: audit_enums_1.AuditAction.ARCHIVE,
            entity_type: audit_enums_1.AuditEntityType.NOTICE,
            entity_id: saved.id ?? null,
            old_values: oldValues,
            new_values: (0, audit_context_1.toSnapshot)(saved),
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return saved;
    }
};
exports.NoticeService = NoticeService;
exports.NoticeService = NoticeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource,
        audit_service_1.AuditService])
], NoticeService);
//# sourceMappingURL=notice.service.js.map