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
exports.VisitorApprovalController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const visitor_approval_service_1 = require("./visitor-approval.service");
const visitor_approval_entity_1 = require("../database/entities/visitor-approval.entity");
const create_visitor_approval_dto_1 = require("./dto/create-visitor-approval.dto");
const update_visitor_approval_dto_1 = require("./dto/update-visitor-approval.dto");
let VisitorApprovalController = class VisitorApprovalController {
    visitorApprovalService;
    constructor(visitorApprovalService) {
        this.visitorApprovalService = visitorApprovalService;
    }
    async createVisitorApproval(createVisitorApprovalDto) {
        return this.visitorApprovalService.createVisitorApproval({
            organization_id: createVisitorApprovalDto.organization_id,
            visitor_visit_id: createVisitorApprovalDto.visitor_visit_id,
            approval_status: createVisitorApprovalDto.approval_status,
            approver_id: createVisitorApprovalDto.approver_id,
            approved_at: createVisitorApprovalDto.approved_at,
            rejected_at: createVisitorApprovalDto.rejected_at,
        });
    }
    async findAllVisitorApprovals() {
        return this.visitorApprovalService.findAll();
    }
    async findVisitorApproval(id) {
        return this.visitorApprovalService.findOne(id);
    }
    async updateVisitorApproval(id, updateVisitorApprovalDto) {
        return this.visitorApprovalService.update(id, updateVisitorApprovalDto);
    }
    async removeVisitorApproval(id) {
        return this.visitorApprovalService.remove(id);
    }
};
exports.VisitorApprovalController = VisitorApprovalController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.CREATED, type: visitor_approval_entity_1.VisitorApproval }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_visitor_approval_dto_1.CreateVisitorApprovalDto]),
    __metadata("design:returntype", Promise)
], VisitorApprovalController.prototype, "createVisitorApproval", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, type: [visitor_approval_entity_1.VisitorApproval] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], VisitorApprovalController.prototype, "findAllVisitorApprovals", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, type: visitor_approval_entity_1.VisitorApproval }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VisitorApprovalController.prototype, "findVisitorApproval", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, type: visitor_approval_entity_1.VisitorApproval }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_visitor_approval_dto_1.UpdateVisitorApprovalDto]),
    __metadata("design:returntype", Promise)
], VisitorApprovalController.prototype, "updateVisitorApproval", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, type: visitor_approval_entity_1.VisitorApproval }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VisitorApprovalController.prototype, "removeVisitorApproval", null);
exports.VisitorApprovalController = VisitorApprovalController = __decorate([
    (0, common_1.Controller)('visitor-approvals'),
    (0, swagger_1.ApiTags)('visitor-approvals'),
    __metadata("design:paramtypes", [visitor_approval_service_1.VisitorApprovalService])
], VisitorApprovalController);
//# sourceMappingURL=visitor-approval.controller.js.map