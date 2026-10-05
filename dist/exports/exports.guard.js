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
exports.ExportAuthorizationGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const require_permission_decorator_1 = require("../authorization/require-permission.decorator");
const authorization_service_1 = require("../authorization/authorization.service");
let ExportAuthorizationGuard = class ExportAuthorizationGuard {
    reflector;
    authorizationService;
    constructor(reflector, authorizationService) {
        this.reflector = reflector;
        this.authorizationService = authorizationService;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const userId = request.user?.id;
        if (!userId) {
            return false;
        }
        const requiredPermission = this.reflector.getAllAndOverride(require_permission_decorator_1.REQUIRED_PERMISSION_KEY, [context.getHandler(), context.getClass()]);
        if (!requiredPermission) {
            return false;
        }
        const orgContext = request.orgContext ?? {};
        const targetOrganizationId = orgContext.targetOrganizationId ??
            orgContext.organizationId ??
            undefined;
        return this.authorizationService.hasPermission(userId, requiredPermission, targetOrganizationId);
    }
};
exports.ExportAuthorizationGuard = ExportAuthorizationGuard;
exports.ExportAuthorizationGuard = ExportAuthorizationGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        authorization_service_1.AuthorizationService])
], ExportAuthorizationGuard);
//# sourceMappingURL=exports.guard.js.map