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
exports.PaymentService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const payment_entity_1 = require("../database/entities/payment.entity");
const maintenance_due_entity_1 = require("../database/entities/maintenance-due.entity");
const resident_entity_1 = require("../database/entities/resident.entity");
const organization_context_service_1 = require("../organization/organization-context.service");
const audit_service_1 = require("../audit/audit.service");
const audit_enums_1 = require("../audit/audit.enums");
const audit_context_1 = require("../audit/audit-context");
let PaymentService = class PaymentService {
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
    async create(createDto, creatorUserId) {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const due = await this.dataSource
            .getRepository('MaintenanceDue')
            .findOneBy({
            id: createDto.maintenance_due_id,
            organization_id: orgContext.isSuperAdmin && orgContext.targetOrganizationId
                ? orgContext.targetOrganizationId
                : orgContext.organization_id,
        });
        if (!due) {
            throw new common_1.ForbiddenException('Maintenance due not found or access denied');
        }
        if (createDto.resident_id) {
            const resident = await this.dataSource.getRepository(resident_entity_1.Resident).findOneBy({
                id: createDto.resident_id,
                organization_id: orgContext.isSuperAdmin && orgContext.targetOrganizationId
                    ? orgContext.targetOrganizationId
                    : orgContext.organization_id,
            });
            if (!resident) {
                throw new common_1.ForbiddenException('Resident not found or access denied');
            }
        }
        if (createDto.flat_id) {
            const flat = await this.dataSource.getRepository('Flat').findOneBy({
                id: createDto.flat_id,
                organization_id: orgContext.isSuperAdmin && orgContext.targetOrganizationId
                    ? orgContext.targetOrganizationId
                    : orgContext.organization_id,
            });
            if (!flat) {
                throw new common_1.ForbiddenException('Flat not found or access denied');
            }
        }
        const outstanding = due.calculated_amount + due.late_charge - due.late_charge_waived;
        if (createDto.amount > outstanding) {
            throw new common_1.ForbiddenException(`Payment amount ${createDto.amount} exceeds outstanding amount ${outstanding}`);
        }
        const existingPayment = await this.dataSource
            .getRepository(payment_entity_1.Payment)
            .findOneBy({
            maintenance_due_id: createDto.maintenance_due_id,
            payment_date: new Date(),
        });
        if (existingPayment) {
            throw new common_1.ForbiddenException('A payment already exists for this due today');
        }
        const payment = this.dataSource.getRepository(payment_entity_1.Payment).create({
            id: '00000000-0000-0000-0000-000000000000',
            organization_id: orgContext.isSuperAdmin && orgContext.targetOrganizationId
                ? orgContext.targetOrganizationId
                : orgContext.organization_id,
            resident_id: createDto.resident_id,
            flat_id: createDto.flat_id,
            maintenance_due_id: createDto.maintenance_due_id,
            amount: createDto.amount,
            payment_method: createDto.payment_method,
            payment_status: 'PENDING',
            payment_date: new Date(),
            transaction_id: null,
            created_by: creatorUserId,
        });
        await this.dataSource.getRepository(payment_entity_1.Payment).save(payment);
        if (createDto.amount >= outstanding) {
            due.status = 'PAID';
            due.payment_received_at = new Date();
            await this.dataSource.getRepository(maintenance_due_entity_1.MaintenanceDue).save(due);
        }
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: payment.organization_id,
            }),
            action: audit_enums_1.AuditAction.CREATE,
            entity_type: audit_enums_1.AuditEntityType.PAYMENT,
            entity_id: payment.id ?? null,
            old_values: null,
            new_values: (0, audit_context_1.toSnapshot)(payment),
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return payment;
    }
    async findOne(id, orgContext) {
        const condition = orgContext.isSuperAdmin && orgContext.targetOrganizationId
            ? orgContext.targetOrganizationId
            : orgContext.organization_id;
        const payment = await this.dataSource.getRepository(payment_entity_1.Payment).findOneBy({
            id,
            organization_id: condition,
        });
        if (!payment) {
            throw new common_1.ForbiddenException('Payment not found or access denied');
        }
        return payment;
    }
    async findAllByOrganization(organizationId, orgContext) {
        const condition = orgContext.isSuperAdmin && orgContext.targetOrganizationId
            ? orgContext.targetOrganizationId
            : orgContext.organization_id;
        const query = this.dataSource
            .getRepository(payment_entity_1.Payment)
            .createQueryBuilder('payment');
        query.where('payment.organization_id = :orgId', { orgId: condition });
        return query.getMany();
    }
    async findAllByResident(residentId, orgContext) {
        const condition = orgContext.isSuperAdmin && orgContext.targetOrganizationId
            ? orgContext.targetOrganizationId
            : orgContext.organization_id;
        const query = this.dataSource
            .getRepository(payment_entity_1.Payment)
            .createQueryBuilder('payment');
        query.where('payment.resident_id = :residentId', { residentId });
        if (!orgContext.isSuperAdmin && orgContext.organization_id) {
            query.andWhere('payment.organization_id = :orgId', {
                orgId: orgContext.organization_id,
            });
        }
        return query.getMany();
    }
    async markCompleted(paymentId, orgContext) {
        const payment = await this.findOne(paymentId, orgContext);
        if (payment.payment_status === 'COMPLETED') {
            return payment;
        }
        const oldValues = (0, audit_context_1.toSnapshot)(payment);
        payment.payment_status = 'COMPLETED';
        await this.dataSource.getRepository(payment_entity_1.Payment).save(payment);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: payment.organization_id,
            }),
            action: audit_enums_1.AuditAction.MARK_COMPLETED,
            entity_type: audit_enums_1.AuditEntityType.PAYMENT,
            entity_id: payment.id ?? null,
            old_values: oldValues,
            new_values: (0, audit_context_1.toSnapshot)(payment),
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return payment;
    }
    async markFailed(paymentId, orgContext) {
        const payment = await this.findOne(paymentId, orgContext);
        if (payment.payment_status === 'FAILED') {
            return payment;
        }
        const oldValues = (0, audit_context_1.toSnapshot)(payment);
        payment.payment_status = 'FAILED';
        await this.dataSource.getRepository(payment_entity_1.Payment).save(payment);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: payment.organization_id,
            }),
            action: audit_enums_1.AuditAction.MARK_FAILED,
            entity_type: audit_enums_1.AuditEntityType.PAYMENT,
            entity_id: payment.id ?? null,
            old_values: oldValues,
            new_values: (0, audit_context_1.toSnapshot)(payment),
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return payment;
    }
};
exports.PaymentService = PaymentService;
exports.PaymentService = PaymentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource,
        organization_context_service_1.OrganizationContextService,
        audit_service_1.AuditService])
], PaymentService);
//# sourceMappingURL=payment.service.js.map