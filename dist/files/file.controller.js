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
exports.FileController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const auth_guard_1 = require("../auth/guards/auth.guard");
const organization_guard_1 = require("../organization/organization.guard");
const require_permission_decorator_1 = require("../authorization/require-permission.decorator");
const file_service_1 = require("./file.service");
let FileController = class FileController {
    fileService;
    constructor(fileService) {
        this.fileService = fileService;
    }
    async upload(req, file) {
        const userId = req.user.id;
        const organizationId = req.orgContext.organizationId;
        return this.fileService.upload(organizationId, userId, file.originalname, file.mimetype, file.buffer, {
            orgContext: req.orgContext,
            actorUserId: userId,
            entityOrganizationId: organizationId,
            request: req,
        });
    }
    async retrieve(req, id, res) {
        const organizationId = req.orgContext.organizationId;
        const { buffer, metadata } = await this.fileService.retrieve(id, organizationId);
        res.set('Content-Type', metadata.mime_type);
        res.set('Content-Disposition', `inline; filename="${metadata.original_filename}"`);
        res.send(buffer);
    }
    async remove(req, id) {
        const userId = req.user.id;
        const organizationId = req.orgContext.organizationId;
        await this.fileService.remove(id, organizationId, userId, {
            orgContext: req.orgContext,
            actorUserId: userId,
            entityOrganizationId: organizationId,
            request: req,
        });
        return { message: 'File deactivated' };
    }
};
exports.FileController = FileController;
__decorate([
    (0, common_1.Post)('upload'),
    (0, require_permission_decorator_1.RequirePermission)('file:upload'),
    (0, require_permission_decorator_1.RequireOrganizationId)(),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FileController.prototype, "upload", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, require_permission_decorator_1.RequirePermission)('file:read'),
    (0, require_permission_decorator_1.RequireOrganizationId)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Response)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], FileController.prototype, "retrieve", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, require_permission_decorator_1.RequirePermission)('file:manage'),
    (0, require_permission_decorator_1.RequireOrganizationId)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], FileController.prototype, "remove", null);
exports.FileController = FileController = __decorate([
    (0, common_1.Controller)('files'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, organization_guard_1.OrganizationGuard),
    __metadata("design:paramtypes", [file_service_1.FileService])
], FileController);
//# sourceMappingURL=file.controller.js.map