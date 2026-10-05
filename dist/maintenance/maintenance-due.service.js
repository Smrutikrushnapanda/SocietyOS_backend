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
exports.MaintenanceDueService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const maintenance_due_entity_1 = require("../database/entities/maintenance-due.entity");
const flat_entity_1 = require("../database/entities/flat.entity");
const maintenance_configuration_entity_1 = require("../database/entities/maintenance-configuration.entity");
const organization_context_service_1 = require("../organization/organization-context.service");
const audit_service_1 = require("../audit/audit.service");
const audit_enums_1 = require("../audit/audit.enums");
const audit_context_1 = require("../audit/audit-context");
let MaintenanceDueService = class MaintenanceDueService {
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
    async generateDue(flatId, billingPeriodStart, billingPeriodEnd) {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const flat = await this.dataSource.getRepository(flat_entity_1.Flat).findOneBy({
            id: flatId,
            organization_id: orgContext.isSuperAdmin && orgContext.targetOrganizationId
                ? orgContext.targetOrganizationId
                : orgContext.organization_id,
        });
        if (!flat) {
            throw new common_1.ForbiddenException('Flat not found or access denied');
        }
        const existingDue = await this.dataSource
            .getRepository(maintenance_due_entity_1.MaintenanceDue)
            .findOneBy({
            flat_id: flatId,
            billing_period_start: billingPeriodStart,
            billing_period_end: billingPeriodEnd,
        });
        if (existingDue) {
            throw new common_1.ForbiddenException('A maintenance due already exists for this flat and billing period');
        }
        const config = await this.dataSource
            .getRepository(maintenance_configuration_entity_1.MaintenanceConfiguration)
            .findOneBy({
            organization_id: flat.organization_id,
            is_active: true,
        });
        if (!config) {
            throw new common_1.ForbiddenException('No active maintenance configuration found for organization');
        }
        const calculatedAmount = Math.round(config.base_maintenance_amount * flat.maintenance_multiplier * 100) / 100;
        const dueDate = this.calculateDueDate(billingPeriodStart, config.due_day_of_month);
        const due = this.dataSource.getRepository(maintenance_due_entity_1.MaintenanceDue).create({
            id: '00000000-0000-0000-0000-000000000000',
            flat_id: flatId,
            organization_id: flat.organization_id,
            base_maintenance_amount: config.base_maintenance_amount,
            maintenance_multiplier: flat.maintenance_multiplier,
            calculated_amount: calculatedAmount,
            billing_period_start: billingPeriodStart,
            billing_period_end: billingPeriodEnd,
            due_date: dueDate,
            late_charge: 0,
            late_charge_waived: 0,
            status: 'PENDING',
        });
        await this.dataSource.getRepository(maintenance_due_entity_1.MaintenanceDue).save(due);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: due.organization_id,
            }),
            action: audit_enums_1.AuditAction.GENERATE,
            entity_type: audit_enums_1.AuditEntityType.MAINTENANCE_DUE,
            entity_id: due.id ?? null,
            old_values: null,
            new_values: (0, audit_context_1.toSnapshot)(due),
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return due;
    }
    calculateDueDate(billingPeriodStart, dueDay) {
        const start = new Date(billingPeriodStart);
        start.setDate(dueDay);
        return start;
    }
    async findOne(id, orgContext) {
        const flatIdCondition = orgContext.isSuperAdmin && orgContext.targetOrganizationId
            ? orgContext.targetOrganizationId
            : orgContext.organization_id;
        const due = await this.dataSource.getRepository(maintenance_due_entity_1.MaintenanceDue).findOneBy({
            id,
            organization_id: flatIdCondition,
        });
        if (!due) {
            throw new common_1.ForbiddenException('Maintenance due not found or access denied');
        }
        return due;
    }
    async findAllByOrganization() {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const flatIdCondition = orgContext.isSuperAdmin && orgContext.targetOrganizationId
            ? orgContext.targetOrganizationId
            : orgContext.organization_id;
        const query = this.dataSource
            .getRepository(maintenance_due_entity_1.MaintenanceDue)
            .createQueryBuilder('due');
        if (!orgContext.isSuperAdmin && orgContext.organization_id) {
            query.where('due.organization_id = :orgId', {
                orgId: orgContext.organization_id,
            });
        }
        return query.getMany();
    }
    async findAllByFlat(flatId, orgContext) {
        const organizationId = orgContext.isSuperAdmin && orgContext.targetOrganizationId
            ? orgContext.targetOrganizationId
            : orgContext.organization_id;
        const query = this.dataSource
            .getRepository(maintenance_due_entity_1.MaintenanceDue)
            .createQueryBuilder('due');
        query.where('due.flat_id = :flatId', { flatId });
        if (!orgContext.isSuperAdmin && orgContext.organization_id) {
            query.andWhere('due.organization_id = :orgId', { orgId: organizationId });
        }
        return query.getMany();
    }
    async markPaid(dueId, orgContext) {
        const due = await this.findOne(dueId, orgContext);
        if (due.status === 'PAID') {
            return due;
        }
        const oldValues = (0, audit_context_1.toSnapshot)(due);
        due.status = 'PAID';
        due.payment_received_at = new Date();
        await this.dataSource.getRepository(maintenance_due_entity_1.MaintenanceDue).save(due);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: due.organization_id,
            }),
            action: audit_enums_1.AuditAction.MARK_PAID,
            entity_type: audit_enums_1.AuditEntityType.MAINTENANCE_DUE,
            entity_id: due.id ?? null,
            old_values: oldValues,
            new_values: (0, audit_context_1.toSnapshot)(due),
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return due;
    }
    async markOverdue(dueId, orgContext) {
        const due = await this.findOne(dueId, orgContext);
        if (due.status === 'OVERDUE') {
            return due;
        }
        const oldValues = (0, audit_context_1.toSnapshot)(due);
        const now = new Date();
        if (now > due.due_date) {
            due.status = 'OVERDUE';
            await this.calculateAndApplyLateCharge(due, now);
        }
        await this.dataSource.getRepository(maintenance_due_entity_1.MaintenanceDue).save(due);
        if (due.status === 'OVERDUE') {
            await (0, audit_context_1.recordAudit)(this.auditService, {
                ...(0, audit_context_1.resolveAuditContext)({
                    orgContext,
                    entityOrganizationId: due.organization_id,
                }),
                action: audit_enums_1.AuditAction.MARK_OVERDUE,
                entity_type: audit_enums_1.AuditEntityType.MAINTENANCE_DUE,
                entity_id: due.id ?? null,
                old_values: oldValues,
                new_values: (0, audit_context_1.toSnapshot)(due),
                ...(0, audit_context_1.extractRequestMeta)(undefined),
            });
        }
        return due;
    }
    async calculateAndApplyLateCharge(due, now) {
        const config = await this.dataSource
            .getRepository(maintenance_configuration_entity_1.MaintenanceConfiguration)
            .findOneBy({
            organization_id: due.organization_id,
        });
        if (!config)
            return;
        const graceDays = config.late_charge_grace_days || 0;
        const graceCutoff = new Date(due.due_date);
        graceCutoff.setDate(graceCutoff.getDate() + graceDays);
        if (now <= graceCutoff) {
            return;
        }
        let lateCharge = 0;
        if (config.late_charge_type === 'FIXED') {
            lateCharge = config.late_charge_value;
        }
        else if (config.late_charge_type === 'PERCENTAGE') {
            lateCharge =
                Math.round(((due.calculated_amount * config.late_charge_value) / 100) * 100) / 100;
        }
        due.late_charge = lateCharge;
        await this.dataSource.getRepository(maintenance_due_entity_1.MaintenanceDue).save(due);
    }
    async waiveLateCharge(dueId, adminUserId, reason) {
        const orgContext = (await this.organizationContextService.getCurrentOrganization({}));
        const due = await this.findOne(dueId, orgContext);
        const userRoleRepo = this.dataSource.getRepository('UserRole');
        const userRole = await userRoleRepo.findOneBy({ userId: adminUserId });
        if (!userRole) {
            throw new common_1.ForbiddenException('User role not found');
        }
        const roleRepo = this.dataSource.getRepository('Role');
        const role = await roleRepo.findOneBy({ id: userRole.roleId });
        if (!role) {
            throw new common_1.ForbiddenException('Role not found');
        }
        if (role.name !== 'SUPER_ADMIN' && role.name !== 'SOCIETY_ADMIN') {
            throw new common_1.ForbiddenException('Only SOCIETY_ADMIN or SUPER_ADMIN can waive late charges');
        }
        if (due.late_charge_waived >= due.late_charge) {
            throw new common_1.ForbiddenException('Late charge has already been fully waived');
        }
        const oldValues = (0, audit_context_1.toSnapshot)(due);
        due.late_charge_waived = due.late_charge;
        due.late_charge_waived_by = adminUserId;
        due.late_charge_waived_at = new Date();
        due.late_charge_waiver_reason = reason ?? null;
        await this.dataSource.getRepository(maintenance_due_entity_1.MaintenanceDue).save(due);
        await (0, audit_context_1.recordAudit)(this.auditService, {
            ...(0, audit_context_1.resolveAuditContext)({
                orgContext,
                entityOrganizationId: due.organization_id,
            }),
            action: audit_enums_1.AuditAction.WAIVE_LATE_CHARGE,
            entity_type: audit_enums_1.AuditEntityType.MAINTENANCE_DUE,
            entity_id: due.id ?? null,
            old_values: oldValues,
            new_values: (0, audit_context_1.toSnapshot)(due),
            ...(0, audit_context_1.extractRequestMeta)(undefined),
        });
        return due;
    }
};
exports.MaintenanceDueService = MaintenanceDueService;
exports.MaintenanceDueService = MaintenanceDueService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource,
        organization_context_service_1.OrganizationContextService,
        audit_service_1.AuditService])
], MaintenanceDueService);
//# sourceMappingURL=maintenance-due.service.js.map