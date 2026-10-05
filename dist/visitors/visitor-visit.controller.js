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
exports.VisitorVisitController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const visitor_visit_service_1 = require("./visitor-visit.service");
const visitor_visit_entity_1 = require("../database/entities/visitor-visit.entity");
const create_visitor_visit_dto_1 = require("./dto/create-visitor-visit.dto");
const update_visitor_visit_dto_1 = require("./dto/update-visitor-visit.dto");
let VisitorVisitController = class VisitorVisitController {
    visitorVisitService;
    constructor(visitorVisitService) {
        this.visitorVisitService = visitorVisitService;
    }
    async createVisitorVisit(createVisitorVisitDto) {
        return this.visitorVisitService.createVisitorVisit({
            organization_id: createVisitorVisitDto.organization_id,
            visitor_id: createVisitorVisitDto.visitor_id,
            visit_status: createVisitorVisitDto.visit_status,
            visit_purpose: createVisitorVisitDto.visit_purpose,
            expected_entry_time: createVisitorVisitDto.expected_entry_time,
        });
    }
    async findAllVisitorVisits() {
        return this.visitorVisitService.findAll();
    }
    async findVisitorVisit(id) {
        return this.visitorVisitService.findOne(id);
    }
    async updateVisitorVisit(id, updateVisitorVisitDto) {
        return this.visitorVisitService.update(id, updateVisitorVisitDto);
    }
    async removeVisitorVisit(id) {
        return this.visitorVisitService.remove(id);
    }
};
exports.VisitorVisitController = VisitorVisitController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.CREATED, type: visitor_visit_entity_1.VisitorVisit }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_visitor_visit_dto_1.CreateVisitorVisitDto]),
    __metadata("design:returntype", Promise)
], VisitorVisitController.prototype, "createVisitorVisit", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, type: [visitor_visit_entity_1.VisitorVisit] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], VisitorVisitController.prototype, "findAllVisitorVisits", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, type: visitor_visit_entity_1.VisitorVisit }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VisitorVisitController.prototype, "findVisitorVisit", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, type: visitor_visit_entity_1.VisitorVisit }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_visitor_visit_dto_1.UpdateVisitorVisitDto]),
    __metadata("design:returntype", Promise)
], VisitorVisitController.prototype, "updateVisitorVisit", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, type: visitor_visit_entity_1.VisitorVisit }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VisitorVisitController.prototype, "removeVisitorVisit", null);
exports.VisitorVisitController = VisitorVisitController = __decorate([
    (0, common_1.Controller)('visitor-visits'),
    (0, swagger_1.ApiTags)('visitor-visits'),
    __metadata("design:paramtypes", [visitor_visit_service_1.VisitorVisitService])
], VisitorVisitController);
//# sourceMappingURL=visitor-visit.controller.js.map