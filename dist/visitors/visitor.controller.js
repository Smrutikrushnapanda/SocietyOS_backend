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
exports.VisitorController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const visitor_service_1 = require("./visitor.service");
const visitor_entity_1 = require("../database/entities/visitor.entity");
const create_visitor_dto_1 = require("./dto/create-visitor.dto");
const update_visitor_dto_1 = require("./dto/update-visitor.dto");
let VisitorController = class VisitorController {
    visitorService;
    constructor(visitorService) {
        this.visitorService = visitorService;
    }
    async createVisitor(createVisitorDto) {
        return this.visitorService.createVisitor({
            organization_id: createVisitorDto.organization_id,
            name: createVisitorDto.name,
            mobile: createVisitorDto.mobile,
            active: createVisitorDto.active,
        });
    }
    async findAllVisitors() {
        return this.visitorService.findAll();
    }
    async findVisitor(id) {
        return this.visitorService.findOne(id);
    }
    async updateVisitor(id, updateVisitorDto) {
        return this.visitorService.update(id, updateVisitorDto);
    }
    async removeVisitor(id) {
        return this.visitorService.remove(id);
    }
};
exports.VisitorController = VisitorController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.CREATED, type: visitor_entity_1.Visitor }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_visitor_dto_1.CreateVisitorDto]),
    __metadata("design:returntype", Promise)
], VisitorController.prototype, "createVisitor", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, type: [visitor_entity_1.Visitor] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], VisitorController.prototype, "findAllVisitors", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, type: visitor_entity_1.Visitor }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VisitorController.prototype, "findVisitor", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, type: visitor_entity_1.Visitor }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_visitor_dto_1.UpdateVisitorDto]),
    __metadata("design:returntype", Promise)
], VisitorController.prototype, "updateVisitor", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, type: visitor_entity_1.Visitor }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VisitorController.prototype, "removeVisitor", null);
exports.VisitorController = VisitorController = __decorate([
    (0, common_1.Controller)('visitors'),
    (0, swagger_1.ApiTags)('visitors'),
    __metadata("design:paramtypes", [visitor_service_1.VisitorService])
], VisitorController);
//# sourceMappingURL=visitor.controller.js.map