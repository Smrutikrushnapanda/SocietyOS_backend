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
exports.VisitorPassController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const visitor_pass_service_1 = require("./visitor-pass.service");
const visitor_pass_entity_1 = require("../database/entities/visitor-pass.entity");
const create_visitor_pass_dto_1 = require("./dto/create-visitor-pass.dto");
const update_visitor_pass_dto_1 = require("./dto/update-visitor-pass.dto");
let VisitorPassController = class VisitorPassController {
    visitorPassService;
    constructor(visitorPassService) {
        this.visitorPassService = visitorPassService;
    }
    async createVisitorPass(createVisitorPassDto) {
        return this.visitorPassService.createVisitorPass({
            organization_id: createVisitorPassDto.organization_id,
            visitor_id: createVisitorPassDto.visitor_id,
            visitor_visit_id: createVisitorPassDto.visitor_visit_id,
            issuer: createVisitorPassDto.issuer,
            pass_status: createVisitorPassDto.pass_status,
            validity_start: createVisitorPassDto.validity_start,
            validity_end: createVisitorPassDto.validity_end,
        });
    }
    async findAllVisitorPasses() {
        return this.visitorPassService.findAll();
    }
    async findVisitorPass(id) {
        return this.visitorPassService.findOne(id);
    }
    async updateVisitorPass(id, updateVisitorPassDto) {
        return this.visitorPassService.update(id, updateVisitorPassDto);
    }
    async removeVisitorPass(id) {
        return this.visitorPassService.remove(id);
    }
};
exports.VisitorPassController = VisitorPassController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.CREATED, type: visitor_pass_entity_1.VisitorPass }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_visitor_pass_dto_1.CreateVisitorPassDto]),
    __metadata("design:returntype", Promise)
], VisitorPassController.prototype, "createVisitorPass", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, type: [visitor_pass_entity_1.VisitorPass] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], VisitorPassController.prototype, "findAllVisitorPasses", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, type: visitor_pass_entity_1.VisitorPass }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VisitorPassController.prototype, "findVisitorPass", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, type: visitor_pass_entity_1.VisitorPass }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_visitor_pass_dto_1.UpdateVisitorPassDto]),
    __metadata("design:returntype", Promise)
], VisitorPassController.prototype, "updateVisitorPass", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, type: visitor_pass_entity_1.VisitorPass }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VisitorPassController.prototype, "removeVisitorPass", null);
exports.VisitorPassController = VisitorPassController = __decorate([
    (0, common_1.Controller)('visitor-passes'),
    (0, swagger_1.ApiTags)('visitor-passes'),
    __metadata("design:paramtypes", [visitor_pass_service_1.VisitorPassService])
], VisitorPassController);
//# sourceMappingURL=visitor-pass.controller.js.map