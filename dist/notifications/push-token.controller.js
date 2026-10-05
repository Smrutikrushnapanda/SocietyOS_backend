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
exports.PushTokenController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../auth/guards/auth.guard");
const organization_guard_1 = require("../organization/organization.guard");
const require_permission_decorator_1 = require("../authorization/require-permission.decorator");
const push_token_service_1 = require("./push-token.service");
const register_push_token_dto_1 = require("./dto/register-push-token.dto");
const push_token_entity_1 = require("../database/entities/push-token.entity");
let PushTokenController = class PushTokenController {
    pushTokenService;
    constructor(pushTokenService) {
        this.pushTokenService = pushTokenService;
    }
    async register(req, dto) {
        const userId = req.user.id;
        const organizationId = req.orgContext.organizationId;
        const platform = dto.platform ?? push_token_entity_1.PushTokenPlatform.WEB;
        return this.pushTokenService.register(userId, organizationId, dto.token, platform);
    }
    async deactivate(req, id) {
        const userId = req.user.id;
        await this.pushTokenService.deactivate(id, userId);
        return { message: 'Push token deactivated' };
    }
};
exports.PushTokenController = PushTokenController;
__decorate([
    (0, common_1.Post)(),
    (0, require_permission_decorator_1.RequirePermission)('push_token:manage'),
    (0, require_permission_decorator_1.RequireOrganizationId)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, register_push_token_dto_1.RegisterPushTokenDto]),
    __metadata("design:returntype", Promise)
], PushTokenController.prototype, "register", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, require_permission_decorator_1.RequirePermission)('push_token:manage'),
    (0, require_permission_decorator_1.RequireOrganizationId)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PushTokenController.prototype, "deactivate", null);
exports.PushTokenController = PushTokenController = __decorate([
    (0, common_1.Controller)('push-tokens'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, organization_guard_1.OrganizationGuard),
    __metadata("design:paramtypes", [push_token_service_1.PushTokenService])
], PushTokenController);
//# sourceMappingURL=push-token.controller.js.map