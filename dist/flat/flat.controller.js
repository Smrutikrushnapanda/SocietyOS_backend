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
exports.FlatController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const flat_service_1 = require("./flat.service");
const flat_entity_1 = require("../database/entities/flat.entity");
let FlatController = class FlatController {
    flatService;
    constructor(flatService) {
        this.flatService = flatService;
    }
    async create(createFlatDto) {
        return this.flatService.create(createFlatDto);
    }
    async findAll() {
        return this.flatService.findAll();
    }
    async findOne(id) {
        return this.flatService.findOne(id);
    }
    async update(id, updateFlatDto) {
        return this.flatService.update(id, updateFlatDto);
    }
    async remove(id) {
        return this.flatService.remove(id);
    }
    async findByBuilding(buildingId) {
        return this.flatService.findAllByBuilding(buildingId);
    }
};
exports.FlatController = FlatController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.CREATED, type: flat_entity_1.Flat }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FlatController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, type: [flat_entity_1.Flat] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FlatController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, type: flat_entity_1.Flat }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FlatController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, type: flat_entity_1.Flat }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FlatController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, type: flat_entity_1.Flat }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FlatController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)('building/:buildingId'),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, type: [flat_entity_1.Flat] }),
    __param(0, (0, common_1.Param)('buildingId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FlatController.prototype, "findByBuilding", null);
exports.FlatController = FlatController = __decorate([
    (0, common_1.Controller)('flats'),
    (0, swagger_1.ApiTags)('flats'),
    __metadata("design:paramtypes", [flat_service_1.FlatService])
], FlatController);
//# sourceMappingURL=flat.controller.js.map