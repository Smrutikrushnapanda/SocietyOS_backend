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
exports.ResidentController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const resident_service_1 = require("./resident.service");
const resident_entity_1 = require("../database/entities/resident.entity");
let ResidentController = class ResidentController {
    residentService;
    constructor(residentService) {
        this.residentService = residentService;
    }
    async createResident(createResidentDto) {
        return this.residentService.createResident(createResidentDto);
    }
    async findAll() {
        return this.residentService.findAll();
    }
    async findOne(id) {
        return this.residentService.findOne(id);
    }
    async update(id, updateResidentDto) {
        return this.residentService.update(id, updateResidentDto);
    }
    async assignFlat(residentId, body) {
        return this.residentService.assignFlat(residentId, body.flat_id);
    }
};
exports.ResidentController = ResidentController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.CREATED, type: resident_entity_1.Resident }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ResidentController.prototype, "createResident", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, type: [resident_entity_1.Resident] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ResidentController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, type: resident_entity_1.Resident }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ResidentController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, type: resident_entity_1.Resident }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ResidentController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':residentId/assign-flat'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, type: resident_entity_1.Resident }),
    __param(0, (0, common_1.Param)('residentId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ResidentController.prototype, "assignFlat", null);
exports.ResidentController = ResidentController = __decorate([
    (0, common_1.Controller)('residents'),
    (0, swagger_1.ApiTags)('residents'),
    __metadata("design:paramtypes", [resident_service_1.ResidentService])
], ResidentController);
//# sourceMappingURL=resident.controller.js.map