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
var AuditService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const crypto_1 = require("crypto");
const audit_entity_1 = require("./audit.entity");
const audit_sanitizer_1 = require("./audit-sanitizer");
const audit_enums_1 = require("./audit.enums");
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 200;
let AuditService = AuditService_1 = class AuditService {
    dataSource;
    sanitizer;
    logger = new common_1.Logger(AuditService_1.name);
    constructor(dataSource, sanitizer) {
        this.dataSource = dataSource;
        this.sanitizer = sanitizer;
    }
    async record(input) {
        try {
            let oldValues = null;
            let newValues = null;
            try {
                oldValues = this.sanitizer.sanitizeSnapshot(input.entity_type, input.old_values ?? null);
                newValues = this.sanitizer.sanitizeSnapshot(input.entity_type, input.new_values ?? null);
            }
            catch (sanitizeError) {
                this.logger.warn(`Audit sanitization failed for ${input.entity_type}/${input.action}; persisting null snapshots`);
                oldValues = null;
                newValues = null;
                void sanitizeError;
            }
            const repository = this.dataSource.getRepository(audit_entity_1.AuditLog);
            const entity = repository.create({
                id: input.id ?? (0, crypto_1.randomUUID)(),
                actor_user_id: input.actor_user_id ?? null,
                actor_organization_id: input.actor_organization_id ?? null,
                target_organization_id: input.target_organization_id ?? null,
                action: input.action,
                entity_type: input.entity_type,
                entity_id: input.entity_id ?? null,
                old_values: oldValues,
                new_values: newValues,
                ip_address: input.ip_address ?? null,
                user_agent: input.user_agent ?? null,
                created_at: new Date(),
            });
            await repository.save(entity);
        }
        catch (error) {
            this.logger.error(`Failed to write audit log for ${input.entity_type}/${input.action}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async findAll(organizationId, filters = {}) {
        if (!organizationId) {
            throw new common_1.ForbiddenException('Organization context is required');
        }
        const repository = this.dataSource.getRepository(audit_entity_1.AuditLog);
        const query = repository.createQueryBuilder('audit');
        query.where('audit.target_organization_id = :organizationId', {
            organizationId,
        });
        const action = this.parseEnumFilter(filters.action, audit_enums_1.AUDIT_ACTIONS, 'action');
        if (action) {
            query.andWhere('audit.action = :action', { action });
        }
        const entityType = this.parseEnumFilter(filters.entity_type, audit_enums_1.AUDIT_ENTITY_TYPES, 'entity_type');
        if (entityType) {
            query.andWhere('audit.entity_type = :entityType', { entityType });
        }
        if (filters.entity_id) {
            query.andWhere('audit.entity_id = :entityId', {
                entityId: String(filters.entity_id),
            });
        }
        if (filters.actor_user_id) {
            query.andWhere('audit.actor_user_id = :actorUserId', {
                actorUserId: String(filters.actor_user_id),
            });
        }
        const from = this.parseDateFilter(filters.from, 'from');
        if (from) {
            query.andWhere('audit.created_at >= :from', { from });
        }
        const to = this.parseDateFilter(filters.to, 'to');
        if (to) {
            query.andWhere('audit.created_at <= :to', { to });
        }
        query.orderBy('audit.created_at', 'DESC');
        const page = this.parsePositiveInt(filters.page, 1, 1, Number.MAX_SAFE_INTEGER);
        const limit = this.parsePositiveInt(filters.limit, DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
        query.skip((page - 1) * limit).take(limit);
        const [items, total] = await query.getManyAndCount();
        return {
            items,
            total,
            page,
            limit,
            totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
        };
    }
    async findOne(id, organizationId) {
        if (!organizationId) {
            throw new common_1.ForbiddenException('Organization context is required');
        }
        return this.dataSource.getRepository(audit_entity_1.AuditLog).findOne({
            where: { id, target_organization_id: organizationId },
        });
    }
    parseEnumFilter(value, allowed, field) {
        if (value === undefined || value === null || value === '') {
            return undefined;
        }
        if (!allowed.includes(value)) {
            throw new common_1.BadRequestException(`Invalid ${field} filter`);
        }
        return value;
    }
    parseDateFilter(value, field) {
        if (value === undefined || value === null || value === '') {
            return undefined;
        }
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            throw new common_1.BadRequestException(`Invalid ${field} filter`);
        }
        return parsed;
    }
    parsePositiveInt(value, fallback, min, max) {
        if (value === undefined || value === null || value === '') {
            return fallback;
        }
        const parsed = Number.parseInt(String(value), 10);
        if (Number.isNaN(parsed)) {
            return fallback;
        }
        return Math.min(Math.max(parsed, min), max);
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = AuditService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource,
        audit_sanitizer_1.AuditSanitizer])
], AuditService);
//# sourceMappingURL=audit.service.js.map