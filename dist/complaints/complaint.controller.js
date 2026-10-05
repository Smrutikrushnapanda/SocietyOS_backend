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
exports.ComplaintController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../auth/guards/auth.guard");
const organization_guard_1 = require("../organization/organization.guard");
const require_permission_decorator_1 = require("../authorization/require-permission.decorator");
const require_permission_decorator_2 = require("../authorization/require-permission.decorator");
const complaint_service_1 = require("./complaint.service");
const dto_1 = require("./dto");
const dto_2 = require("./dto");
let ComplaintController = class ComplaintController {
    complaintService;
    constructor(complaintService) {
        this.complaintService = complaintService;
    }
    async create(createDto, req) {
        const authenticatedResidentId = req.user?.id;
        const orgContext = req.orgContext;
        return this.complaintService.create(createDto, authenticatedResidentId, orgContext);
    }
    async findAll(req) {
        return this.complaintService.findAll(req.orgContext);
    }
    async findOne(req, id) {
        return this.complaintService.findOne(id, req.orgContext);
    }
    async update(req, id, updateDto) {
        return this.complaintService.update(id, updateDto, req.orgContext);
    }
    async assign(req, id, assignedTo) {
        return this.complaintService.assign(id, assignedTo, req.orgContext);
    }
    async resolve(req, id, reason) {
        return this.complaintService.resolve(id, reason, req.orgContext);
    }
};
exports.ComplaintController = ComplaintController;
__decorate([
    (0, common_1.Post)(),
    (0, require_permission_decorator_1.RequirePermission)('complaint:create'),
    (0, require_permission_decorator_2.RequireOrganizationId)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateComplaintDto, Object]),
    __metadata("design:returntype", Promise)
], ComplaintController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, require_permission_decorator_1.RequirePermission)('complaint:read'),
    (0, require_permission_decorator_2.RequireOrganizationId)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ComplaintController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, require_permission_decorator_1.RequirePermission)('complaint:read'),
    (0, require_permission_decorator_2.RequireOrganizationId)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ComplaintController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, require_permission_decorator_1.RequirePermission)('complaint:manage'),
    (0, require_permission_decorator_2.RequireOrganizationId)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_2.UpdateComplaintDto]),
    __metadata("design:returntype", Promise)
], ComplaintController.prototype, "update", null);
__decorate([
    (0, common_1.Put)(':id/assign'),
    (0, require_permission_decorator_1.RequirePermission)('complaint:manage'),
    (0, require_permission_decorator_2.RequireOrganizationId)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('assigned_to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ComplaintController.prototype, "assign", null);
__decorate([
    (0, common_1.Put)(':id/resolve'),
    (0, require_permission_decorator_1.RequirePermission)('complaint:manage'),
    (0, require_permission_decorator_2.RequireOrganizationId)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('reason')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ComplaintController.prototype, "resolve", null);
exports.ComplaintController = ComplaintController = __decorate([
    (0, common_1.Controller)('complaints'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, organization_guard_1.OrganizationGuard),
    __metadata("design:paramtypes", [complaint_service_1.ComplaintService])
], ComplaintController);
//# sourceMappingURL=complaint.controller.js.map