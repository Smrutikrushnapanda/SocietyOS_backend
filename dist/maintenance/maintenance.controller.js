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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaintenanceController = void 0;
const common_1 = require("@nestjs/common");
const maintenance_configuration_service_1 = require("./maintenance-configuration.service");
const maintenance_due_service_1 = require("./maintenance-due.service");
const payment_service_1 = require("./payment.service");
const dto_1 = require("./dto");
const dto_2 = require("./dto");
const auth_guard_1 = require("../auth/guards/auth.guard");
const permission_guard_1 = require("../authorization/permission.guard");
const require_permission_decorator_1 = require("../authorization/require-permission.decorator");
let MaintenanceController = class MaintenanceController {
    configService;
    dueService;
    paymentService;
    constructor(configService, dueService, paymentService) {
        this.configService = configService;
        this.dueService = dueService;
        this.paymentService = paymentService;
    }
    async getConfig(req) {
        return this.configService.findOneByOrganization(req.orgContext.organizationId);
    }
    async updateConfig(req, updateDto) {
        return this.configService.update(req.orgContext.organizationId, updateDto);
    }
    async generateDue(req, generateDueDto) {
        return this.dueService.generateDue(generateDueDto.flat_id, generateDueDto.billing_period_start, generateDueDto.billing_period_end);
    }
    async getDues(req) {
        return this.dueService.findAllByOrganization();
    }
    async getDue(req, dueId) {
        return this.dueService.findOne(dueId, req.orgContext);
    }
    async markPaid(req, dueId) {
        return this.dueService.markPaid(dueId, req.orgContext);
    }
    async markOverdue(req, dueId) {
        return this.dueService.markOverdue(dueId, req.orgContext);
    }
    async waiveLateCharge(req, dueId, waiveDto) {
        return this.dueService.waiveLateCharge(dueId, req.user.id, waiveDto.reason);
    }
    async createPayment(req, createPaymentDto) {
        return this.paymentService.create(createPaymentDto, req.user.id);
    }
    async getPayments(req) {
        return this.paymentService.findAllByOrganization(req.orgContext.organizationId, req.orgContext);
    }
    async getPayment(req, paymentId) {
        return this.paymentService.findOne(paymentId, req.orgContext);
    }
    async getPaymentsByResident(req, residentId) {
        return this.paymentService.findAllByResident(residentId, req.orgContext);
    }
    async markPaymentCompleted(req, paymentId) {
        return this.paymentService.markCompleted(paymentId, req.orgContext);
    }
    async markPaymentFailed(req, paymentId) {
        return this.paymentService.markFailed(paymentId, req.orgContext);
    }
};
exports.MaintenanceController = MaintenanceController;
__decorate([
    (0, common_1.Get)('config'),
    (0, require_permission_decorator_1.RequirePermission)('maintenance:read'),
    (0, require_permission_decorator_1.RequireOrganizationId)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MaintenanceController.prototype, "getConfig", null);
__decorate([
    (0, common_1.Put)('config'),
    (0, require_permission_decorator_1.RequirePermission)('maintenance:manage'),
    (0, require_permission_decorator_1.RequireOrganizationId)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.UpdateMaintenanceConfigurationDto]),
    __metadata("design:returntype", Promise)
], MaintenanceController.prototype, "updateConfig", null);
__decorate([
    (0, common_1.Post)('dues'),
    (0, require_permission_decorator_1.RequirePermission)('maintenance:manage'),
    (0, require_permission_decorator_1.RequireOrganizationId)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_2.GenerateDueDto]),
    __metadata("design:returntype", Promise)
], MaintenanceController.prototype, "generateDue", null);
__decorate([
    (0, common_1.Get)('dues'),
    (0, require_permission_decorator_1.RequirePermission)('due:read'),
    (0, require_permission_decorator_1.RequireOrganizationId)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MaintenanceController.prototype, "getDues", null);
__decorate([
    (0, common_1.Get)('dues/:id'),
    (0, require_permission_decorator_1.RequirePermission)('due:read'),
    (0, require_permission_decorator_1.RequireOrganizationId)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], MaintenanceController.prototype, "getDue", null);
__decorate([
    (0, common_1.Patch)('dues/:id/mark-paid'),
    (0, require_permission_decorator_1.RequirePermission)('due:manage'),
    (0, require_permission_decorator_1.RequireOrganizationId)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], MaintenanceController.prototype, "markPaid", null);
__decorate([
    (0, common_1.Patch)('dues/:id/mark-overdue'),
    (0, require_permission_decorator_1.RequirePermission)('due:manage'),
    (0, require_permission_decorator_1.RequireOrganizationId)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], MaintenanceController.prototype, "markOverdue", null);
__decorate([
    (0, common_1.Post)('dues/:id/waive-late-charge'),
    (0, require_permission_decorator_1.RequirePermission)('late_charge:waive'),
    (0, require_permission_decorator_1.RequireOrganizationId)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_2.WaiveLateChargeDto]),
    __metadata("design:returntype", Promise)
], MaintenanceController.prototype, "waiveLateCharge", null);
__decorate([
    (0, common_1.Post)('payments'),
    (0, require_permission_decorator_1.RequirePermission)('payment:manage'),
    (0, require_permission_decorator_1.RequireOrganizationId)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_2.CreatePaymentDto]),
    __metadata("design:returntype", Promise)
], MaintenanceController.prototype, "createPayment", null);
__decorate([
    (0, common_1.Get)('payments'),
    (0, require_permission_decorator_1.RequirePermission)('payment:read'),
    (0, require_permission_decorator_1.RequireOrganizationId)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MaintenanceController.prototype, "getPayments", null);
__decorate([
    (0, common_1.Get)('payments/:id'),
    (0, require_permission_decorator_1.RequirePermission)('payment:read'),
    (0, require_permission_decorator_1.RequireOrganizationId)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], MaintenanceController.prototype, "getPayment", null);
__decorate([
    (0, common_1.Get)('payments/resident/:residentId'),
    (0, require_permission_decorator_1.RequirePermission)('payment:read'),
    (0, require_permission_decorator_1.RequireOrganizationId)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('residentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], MaintenanceController.prototype, "getPaymentsByResident", null);
__decorate([
    (0, common_1.Patch)('payments/:id/mark-completed'),
    (0, require_permission_decorator_1.RequirePermission)('payment:manage'),
    (0, require_permission_decorator_1.RequireOrganizationId)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], MaintenanceController.prototype, "markPaymentCompleted", null);
__decorate([
    (0, common_1.Patch)('payments/:id/mark-failed'),
    (0, require_permission_decorator_1.RequirePermission)('payment:manage'),
    (0, require_permission_decorator_1.RequireOrganizationId)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], MaintenanceController.prototype, "markPaymentFailed", null);
exports.MaintenanceController = MaintenanceController = __decorate([
    (0, common_1.Controller)('maintenance'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, permission_guard_1.PermissionGuard),
    __metadata("design:paramtypes", [maintenance_configuration_service_1.MaintenanceConfigurationService,
        maintenance_due_service_1.MaintenanceDueService,
        payment_service_1.PaymentService])
], MaintenanceController);
//# sourceMappingURL=maintenance.controller.js.map