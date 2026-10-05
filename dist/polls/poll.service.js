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
exports.PollService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const poll_entity_1 = require("../database/entities/poll.entity");
const poll_option_entity_1 = require("../database/entities/poll-option.entity");
const poll_vote_entity_1 = require("../database/entities/poll-vote.entity");
const audit_service_1 = require("../audit/audit.service");
const audit_enums_1 = require("../audit/audit.enums");
const audit_context_1 = require("../audit/audit-context");
let PollService = class PollService {
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
        const poll = this.dataSource
            .getRepository(poll_entity_1.Poll)
            .create({
            id: createDto.id,
            organization_id: orgId,
            title: createDto.title,
            description: createDto.description,
            status: 'DRAFT',
            starts_at: createDto.starts_at,
            ends_at: createDto.ends_at,
            created_by: authenticatedUserId,
            created_at: new Date(),
            updated_at: new Date,
        });
        const saved = await this.dataSource.getRepository(poll_entity_1.Poll).save(poll);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: saved.organization_id,
            }),
            action: audit_enums_1.AuditAction.CREATE,
            entity_type: audit_enums_1.AuditEntityType.POLL,
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
            .getRepository(poll_entity_1.Poll)
            .find({ where: { organization_id: orgId } });
    }
    async findOne(id, orgContext) {
        const orgId = orgContext.organizationId;
        return this.dataSource.getRepository(poll_entity_1.Poll).findOne({ where: { id, organization_id: orgId } });
    }
    async start(id, orgContext) {
        const orgId = orgContext.organizationId;
        const poll = await this.findOne(id, orgContext);
        if (!poll)
            return null;
        if (poll.status !== 'DRAFT') {
            throw new common_1.ForbiddenException(`Invalid transition from ${poll.status} to PUBLISHED`);
        }
        const oldValues = (0, audit_context_1.toSnapshot)(poll);
        poll.status = 'PUBLISHED';
        poll.updated_at = new Date;
        const saved = await this.dataSource.getRepository(poll_entity_1.Poll).save(poll);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: saved.organization_id,
            }),
            action: audit_enums_1.AuditAction.START,
            entity_type: audit_enums_1.AuditEntityType.POLL,
            entity_id: saved.id ?? null,
            old_values: oldValues,
            new_values: (0, audit_context_1.toSnapshot)(saved),
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return saved;
    }
    async end(id, orgContext) {
        const orgId = orgContext.organizationId;
        const poll = await this.findOne(id, orgContext);
        if (!poll)
            return null;
        if (poll.status !== 'PUBLISHED') {
            throw new common_1.ForbiddenException(`Invalid transition from ${poll.status} to CLOSED`);
        }
        const oldValues = (0, audit_context_1.toSnapshot)(poll);
        poll.status = 'CLOSED';
        poll.updated_at = new Date;
        const saved = await this.dataSource.getRepository(poll_entity_1.Poll).save(poll);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: saved.organization_id,
            }),
            action: audit_enums_1.AuditAction.END,
            entity_type: audit_enums_1.AuditEntityType.POLL,
            entity_id: saved.id ?? null,
            old_values: oldValues,
            new_values: (0, audit_context_1.toSnapshot)(saved),
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return saved;
    }
    async vote(voteDto, authenticatedResidentId, orgContext) {
        const orgId = orgContext.organizationId;
        const existingVote = await this.dataSource
            .getRepository(poll_vote_entity_1.PollVote)
            .findOne({ where: { poll_id: voteDto.poll_id, resident_id: authenticatedResidentId } });
        if (existingVote) {
            throw new common_1.ForbiddenException('Resident has already voted in this poll');
        }
        const poll = await this.findOne(voteDto.poll_id, orgContext);
        if (!poll) {
            throw new common_1.ForbiddenException('Poll not found');
        }
        if (poll.status !== 'PUBLISHED') {
            throw new common_1.ForbiddenException('Voting is only allowed on published polls');
        }
        const now = new Date();
        if (now < poll.starts_at) {
            throw new common_1.ForbiddenException('Poll has not started yet');
        }
        if (now > poll.ends_at) {
            throw new common_1.ForbiddenException('Poll has ended');
        }
        const option = await this.dataSource
            .getRepository(poll_option_entity_1.PollOption)
            .findOne({ where: { id: voteDto.option_id, poll_id: voteDto.poll_id } });
        if (!option) {
            throw new common_1.ForbiddenException('Invalid poll option');
        }
        if (option.organization_id !== poll.organization_id) {
            throw new common_1.ForbiddenException('Poll option does not belong to this poll\'s organization');
        }
        const resident = await this.dataSource.getRepository('Resident').findOne({
            where: { id: authenticatedResidentId, organization_id: orgId },
        });
        if (!resident) {
            throw new common_1.ForbiddenException('Resident does not belong to this organization');
        }
        const vote = this.dataSource
            .getRepository(poll_vote_entity_1.PollVote)
            .create({
            id: voteDto.id,
            poll_id: voteDto.poll_id,
            option_id: voteDto.option_id,
            resident_id: authenticatedResidentId,
            organization_id: orgId,
            created_at: new Date,
        });
        const saved = await this.dataSource.getRepository(poll_vote_entity_1.PollVote).save(vote);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: poll.organization_id,
            }),
            action: audit_enums_1.AuditAction.VOTE,
            entity_type: audit_enums_1.AuditEntityType.POLL,
            entity_id: poll.id ?? null,
            old_values: null,
            new_values: (0, audit_context_1.toSnapshot)(saved),
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return saved;
    }
    async getResults(pollId, orgContext) {
        const orgId = orgContext.organizationId;
        const votes = await this.dataSource
            .getRepository(poll_vote_entity_1.PollVote)
            .find({ where: { poll_id: pollId, organization_id: orgId } });
        const optionCounts = {};
        votes.forEach(vote => {
            optionCounts[vote.option_id] = (optionCounts[vote.option_id] || 0) + 1;
        });
        const options = await this.dataSource
            .getRepository(poll_option_entity_1.PollOption)
            .find({ where: { poll_id: pollId } });
        return options.map(option => ({
            id: option.id,
            option_text: option.option_text,
            display_order: option.display_order,
            vote_count: optionCounts[option.id] || 0,
        }));
    }
};
exports.PollService = PollService;
exports.PollService = PollService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource,
        audit_service_1.AuditService])
], PollService);
//# sourceMappingURL=poll.service.js.map