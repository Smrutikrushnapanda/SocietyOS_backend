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
exports.ExportsController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../auth/guards/auth.guard");
const organization_guard_1 = require("../organization/organization.guard");
const require_permission_decorator_1 = require("../authorization/require-permission.decorator");
const exports_service_1 = require("./exports.service");
const exports_guard_1 = require("./exports.guard");
const exports_dto_1 = require("./exports.dto");
let ExportsController = class ExportsController {
    exportsService;
    constructor(exportsService) {
        this.exportsService = exportsService;
    }
    async exportResidents(req, query, res) {
        await this.send(res, this.exportsService.exportResidents(this.resolveOrganizationId(req), query ?? new exports_dto_1.ResidentsExportQueryDto()));
    }
    async exportVisitors(req, query, res) {
        await this.send(res, this.exportsService.exportVisitors(this.resolveOrganizationId(req), query ?? new exports_dto_1.VisitorsExportQueryDto()));
    }
    async exportMaintenanceDues(req, query, res) {
        await this.send(res, this.exportsService.exportMaintenanceDues(this.resolveOrganizationId(req), query ?? new exports_dto_1.MaintenanceDuesExportQueryDto()));
    }
    async exportPayments(req, query, res) {
        await this.send(res, this.exportsService.exportPayments(this.resolveOrganizationId(req), query ?? new exports_dto_1.PaymentsExportQueryDto()));
    }
    async exportComplaints(req, query, res) {
        await this.send(res, this.exportsService.exportComplaints(this.resolveOrganizationId(req), query ?? new exports_dto_1.ComplaintsExportQueryDto()));
    }
    async exportNotices(req, query, res) {
        await this.send(res, this.exportsService.exportNotices(this.resolveOrganizationId(req), query ?? new exports_dto_1.NoticesExportQueryDto()));
    }
    async exportPolls(req, query, res) {
        await this.send(res, this.exportsService.exportPolls(this.resolveOrganizationId(req), query ?? new exports_dto_1.PollsExportQueryDto()));
    }
    async send(res, pending) {
        const result = await pending;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.setHeader('X-Export-Truncated', result.truncated ? 'true' : 'false');
        res.setHeader('X-Export-Row-Count', String(result.rowCount));
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.send(result.csv);
    }
    resolveOrganizationId(req) {
        const organizationId = req?.orgContext?.organizationId;
        if (!organizationId) {
            throw new common_1.ForbiddenException('Organization context is required');
        }
        return organizationId;
    }
};
exports.ExportsController = ExportsController;
__decorate([
    (0, common_1.Get)('residents'),
    (0, require_permission_decorator_1.RequirePermission)('report:export'),
    (0, require_permission_decorator_1.RequireOrganizationId)(),
    (0, common_1.Header)('Content-Type', 'text/csv; charset=utf-8'),
    (0, common_1.Header)('X-Content-Type-Options', 'nosniff'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, exports_dto_1.ResidentsExportQueryDto, Object]),
    __metadata("design:returntype", Promise)
], ExportsController.prototype, "exportResidents", null);
__decorate([
    (0, common_1.Get)('visitors'),
    (0, require_permission_decorator_1.RequirePermission)('report:export'),
    (0, require_permission_decorator_1.RequireOrganizationId)(),
    (0, common_1.Header)('Content-Type', 'text/csv; charset=utf-8'),
    (0, common_1.Header)('X-Content-Type-Options', 'nosniff'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, exports_dto_1.VisitorsExportQueryDto, Object]),
    __metadata("design:returntype", Promise)
], ExportsController.prototype, "exportVisitors", null);
__decorate([
    (0, common_1.Get)('maintenance-dues'),
    (0, require_permission_decorator_1.RequirePermission)('report:export'),
    (0, require_permission_decorator_1.RequireOrganizationId)(),
    (0, common_1.Header)('Content-Type', 'text/csv; charset=utf-8'),
    (0, common_1.Header)('X-Content-Type-Options', 'nosniff'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, exports_dto_1.MaintenanceDuesExportQueryDto, Object]),
    __metadata("design:returntype", Promise)
], ExportsController.prototype, "exportMaintenanceDues", null);
__decorate([
    (0, common_1.Get)('payments'),
    (0, require_permission_decorator_1.RequirePermission)('report:export'),
    (0, require_permission_decorator_1.RequireOrganizationId)(),
    (0, common_1.Header)('Content-Type', 'text/csv; charset=utf-8'),
    (0, common_1.Header)('X-Content-Type-Options', 'nosniff'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, exports_dto_1.PaymentsExportQueryDto, Object]),
    __metadata("design:returntype", Promise)
], ExportsController.prototype, "exportPayments", null);
__decorate([
    (0, common_1.Get)('complaints'),
    (0, require_permission_decorator_1.RequirePermission)('report:export'),
    (0, require_permission_decorator_1.RequireOrganizationId)(),
    (0, common_1.Header)('Content-Type', 'text/csv; charset=utf-8'),
    (0, common_1.Header)('X-Content-Type-Options', 'nosniff'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, exports_dto_1.ComplaintsExportQueryDto, Object]),
    __metadata("design:returntype", Promise)
], ExportsController.prototype, "exportComplaints", null);
__decorate([
    (0, common_1.Get)('notices'),
    (0, require_permission_decorator_1.RequirePermission)('report:export'),
    (0, require_permission_decorator_1.RequireOrganizationId)(),
    (0, common_1.Header)('Content-Type', 'text/csv; charset=utf-8'),
    (0, common_1.Header)('X-Content-Type-Options', 'nosniff'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, exports_dto_1.NoticesExportQueryDto, Object]),
    __metadata("design:returntype", Promise)
], ExportsController.prototype, "exportNotices", null);
__decorate([
    (0, common_1.Get)('polls'),
    (0, require_permission_decorator_1.RequirePermission)('report:export'),
    (0, require_permission_decorator_1.RequireOrganizationId)(),
    (0, common_1.Header)('Content-Type', 'text/csv; charset=utf-8'),
    (0, common_1.Header)('X-Content-Type-Options', 'nosniff'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, exports_dto_1.PollsExportQueryDto, Object]),
    __metadata("design:returntype", Promise)
], ExportsController.prototype, "exportPolls", null);
exports.ExportsController = ExportsController = __decorate([
    (0, common_1.Controller)('exports'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, organization_guard_1.OrganizationGuard, exports_guard_1.ExportAuthorizationGuard),
    __metadata("design:paramtypes", [exports_service_1.ExportsService])
], ExportsController);
//# sourceMappingURL=exports.controller.js.map