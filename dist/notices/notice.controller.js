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
exports.NoticeController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../auth/guards/auth.guard");
const organization_guard_1 = require("../organization/organization.guard");
const require_permission_decorator_1 = require("../authorization/require-permission.decorator");
const require_permission_decorator_2 = require("../authorization/require-permission.decorator");
const notice_service_1 = require("./notice.service");
const dto_1 = require("./dto");
let NoticeController = class NoticeController {
    noticeService;
    constructor(noticeService) {
        this.noticeService = noticeService;
    }
    async create(createDto, req) {
        const authenticatedUserId = req.user?.id;
        const orgContext = req.orgContext;
        return this.noticeService.create(createDto, authenticatedUserId, orgContext);
    }
    async findAll(req) {
        return this.noticeService.findAll(req.orgContext);
    }
    async findOne(req, id) {
        return this.noticeService.findOne(id, req.orgContext);
    }
    async publish(req, id) {
        return this.noticeService.publish(id, req.orgContext);
    }
    async expire(req, id) {
        return this.noticeService.expire(id, req.orgContext);
    }
};
exports.NoticeController = NoticeController;
__decorate([
    (0, common_1.Post)(),
    (0, require_permission_decorator_1.RequirePermission)('notice:publish'),
    (0, require_permission_decorator_2.RequireOrganizationId)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateNoticeDto, Object]),
    __metadata("design:returntype", Promise)
], NoticeController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, require_permission_decorator_1.RequirePermission)('notice:read'),
    (0, require_permission_decorator_2.RequireOrganizationId)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NoticeController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, require_permission_decorator_1.RequirePermission)('notice:read'),
    (0, require_permission_decorator_2.RequireOrganizationId)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], NoticeController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id/publish'),
    (0, require_permission_decorator_1.RequirePermission)('notice:publish'),
    (0, require_permission_decorator_2.RequireOrganizationId)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], NoticeController.prototype, "publish", null);
__decorate([
    (0, common_1.Put)(':id/expire'),
    (0, require_permission_decorator_1.RequirePermission)('notice:publish'),
    (0, require_permission_decorator_2.RequireOrganizationId)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], NoticeController.prototype, "expire", null);
exports.NoticeController = NoticeController = __decorate([
    (0, common_1.Controller)('notices'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, organization_guard_1.OrganizationGuard),
    __metadata("design:paramtypes", [notice_service_1.NoticeService])
], NoticeController);
//# sourceMappingURL=notice.controller.js.map