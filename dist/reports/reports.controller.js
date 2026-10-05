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
exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../auth/guards/auth.guard");
const organization_guard_1 = require("../organization/organization.guard");
const require_permission_decorator_1 = require("../authorization/require-permission.decorator");
const reports_service_1 = require("./reports.service");
const reports_guard_1 = require("./reports.guard");
const reports_dto_1 = require("./reports.dto");
let ReportsController = class ReportsController {
    reportsService;
    constructor(reportsService) {
        this.reportsService = reportsService;
    }
    async getOccupancy(req) {
        return this.reportsService.getOccupancy(this.resolveOrganizationId(req));
    }
    async getResidents(req, query) {
        return this.reportsService.getResidents(this.resolveOrganizationId(req), query ?? new reports_dto_1.ResidentsReportQueryDto());
    }
    async getVisitors(req, query) {
        return this.reportsService.getVisitors(this.resolveOrganizationId(req), query ?? new reports_dto_1.VisitorsReportQueryDto());
    }
    async getMaintenanceDues(req, query) {
        return this.reportsService.getMaintenanceDues(this.resolveOrganizationId(req), query ?? new reports_dto_1.MaintenanceDuesReportQueryDto());
    }
    async getPayments(req, query) {
        return this.reportsService.getPayments(this.resolveOrganizationId(req), query ?? new reports_dto_1.PaymentsReportQueryDto());
    }
    async getComplaints(req, query) {
        return this.reportsService.getComplaints(this.resolveOrganizationId(req), query ?? new reports_dto_1.ComplaintsReportQueryDto());
    }
    async getNotices(req, query) {
        return this.reportsService.getNotices(this.resolveOrganizationId(req), query ?? new reports_dto_1.NoticesReportQueryDto());
    }
    async getPolls(req, query) {
        return this.reportsService.getPolls(this.resolveOrganizationId(req), query ?? new reports_dto_1.PollsReportQueryDto());
    }
    resolveOrganizationId(req) {
        const organizationId = req?.orgContext?.organizationId;
        if (!organizationId) {
            throw new common_1.ForbiddenException('Organization context is required');
        }
        return organizationId;
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, common_1.Get)('occupancy'),
    (0, require_permission_decorator_1.RequirePermission)('report:read'),
    (0, require_permission_decorator_1.RequireOrganizationId)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getOccupancy", null);
__decorate([
    (0, common_1.Get)('residents'),
    (0, require_permission_decorator_1.RequirePermission)('report:read'),
    (0, require_permission_decorator_1.RequireOrganizationId)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, reports_dto_1.ResidentsReportQueryDto]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getResidents", null);
__decorate([
    (0, common_1.Get)('visitors'),
    (0, require_permission_decorator_1.RequirePermission)('report:read'),
    (0, require_permission_decorator_1.RequireOrganizationId)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, reports_dto_1.VisitorsReportQueryDto]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getVisitors", null);
__decorate([
    (0, common_1.Get)('maintenance-dues'),
    (0, require_permission_decorator_1.RequirePermission)('report:read'),
    (0, require_permission_decorator_1.RequireOrganizationId)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, reports_dto_1.MaintenanceDuesReportQueryDto]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getMaintenanceDues", null);
__decorate([
    (0, common_1.Get)('payments'),
    (0, require_permission_decorator_1.RequirePermission)('report:read'),
    (0, require_permission_decorator_1.RequireOrganizationId)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, reports_dto_1.PaymentsReportQueryDto]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getPayments", null);
__decorate([
    (0, common_1.Get)('complaints'),
    (0, require_permission_decorator_1.RequirePermission)('report:read'),
    (0, require_permission_decorator_1.RequireOrganizationId)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, reports_dto_1.ComplaintsReportQueryDto]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getComplaints", null);
__decorate([
    (0, common_1.Get)('notices'),
    (0, require_permission_decorator_1.RequirePermission)('report:read'),
    (0, require_permission_decorator_1.RequireOrganizationId)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, reports_dto_1.NoticesReportQueryDto]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getNotices", null);
__decorate([
    (0, common_1.Get)('polls'),
    (0, require_permission_decorator_1.RequirePermission)('report:read'),
    (0, require_permission_decorator_1.RequireOrganizationId)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, reports_dto_1.PollsReportQueryDto]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "getPolls", null);
exports.ReportsController = ReportsController = __decorate([
    (0, common_1.Controller)('reports'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, organization_guard_1.OrganizationGuard, reports_guard_1.ReportAuthorizationGuard),
    __metadata("design:paramtypes", [reports_service_1.ReportsService])
], ReportsController);
//# sourceMappingURL=reports.controller.js.map