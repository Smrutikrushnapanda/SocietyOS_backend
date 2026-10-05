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
exports.PollController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../auth/guards/auth.guard");
const organization_guard_1 = require("../organization/organization.guard");
const require_permission_decorator_1 = require("../authorization/require-permission.decorator");
const require_permission_decorator_2 = require("../authorization/require-permission.decorator");
const poll_service_1 = require("./poll.service");
const dto_1 = require("./dto");
const dto_2 = require("./dto");
let PollController = class PollController {
    pollService;
    constructor(pollService) {
        this.pollService = pollService;
    }
    async create(createDto, req) {
        const authenticatedUserId = req.user?.id;
        const orgContext = req.orgContext;
        return this.pollService.create(createDto, authenticatedUserId, orgContext);
    }
    async findAll(req) {
        return this.pollService.findAll(req.orgContext);
    }
    async findOne(req, id) {
        return this.pollService.findOne(id, req.orgContext);
    }
    async start(req, id) {
        return this.pollService.start(id, req.orgContext);
    }
    async end(req, id) {
        return this.pollService.end(id, req.orgContext);
    }
    async vote(req, voteDto) {
        const authenticatedResidentId = req.user?.id;
        return this.pollService.vote(voteDto, authenticatedResidentId, req.orgContext);
    }
    async getResults(req, id) {
        return this.pollService.getResults(id, req.orgContext);
    }
};
exports.PollController = PollController;
__decorate([
    (0, common_1.Post)(),
    (0, require_permission_decorator_1.RequirePermission)('poll:manage'),
    (0, require_permission_decorator_2.RequireOrganizationId)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreatePollDto, Object]),
    __metadata("design:returntype", Promise)
], PollController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, require_permission_decorator_1.RequirePermission)('poll:read'),
    (0, require_permission_decorator_2.RequireOrganizationId)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PollController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, require_permission_decorator_1.RequirePermission)('poll:read'),
    (0, require_permission_decorator_2.RequireOrganizationId)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PollController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id/start'),
    (0, require_permission_decorator_1.RequirePermission)('poll:manage'),
    (0, require_permission_decorator_2.RequireOrganizationId)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PollController.prototype, "start", null);
__decorate([
    (0, common_1.Put)(':id/end'),
    (0, require_permission_decorator_1.RequirePermission)('poll:manage'),
    (0, require_permission_decorator_2.RequireOrganizationId)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PollController.prototype, "end", null);
__decorate([
    (0, common_1.Post)(':id/vote'),
    (0, require_permission_decorator_1.RequirePermission)('poll:vote'),
    (0, require_permission_decorator_2.RequireOrganizationId)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_2.VotePollDto]),
    __metadata("design:returntype", Promise)
], PollController.prototype, "vote", null);
__decorate([
    (0, common_1.Get)(':id/results'),
    (0, require_permission_decorator_1.RequirePermission)('poll:read'),
    (0, require_permission_decorator_2.RequireOrganizationId)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PollController.prototype, "getResults", null);
exports.PollController = PollController = __decorate([
    (0, common_1.Controller)('polls'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, organization_guard_1.OrganizationGuard),
    __metadata("design:paramtypes", [poll_service_1.PollService])
], PollController);
//# sourceMappingURL=poll.controller.js.map