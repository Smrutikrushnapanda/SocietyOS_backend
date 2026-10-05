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
exports.FloorController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const floor_service_1 = require("./floor.service");
const floor_entity_1 = require("../database/entities/floor.entity");
let FloorController = class FloorController {
    floorService;
    constructor(floorService) {
        this.floorService = floorService;
    }
    async create(createFloorDto) {
        return this.floorService.create(createFloorDto);
    }
    async findAll() {
        return this.floorService.findAll();
    }
    async findOne(id) {
        return this.floorService.findOne(id);
    }
    async update(id, updateFloorDto) {
        return this.floorService.update(id, updateFloorDto);
    }
    async remove(id) {
        return this.floorService.remove(id);
    }
    async findByBuilding(buildingId) {
        return this.floorService.findAllByBuilding(buildingId);
    }
};
exports.FloorController = FloorController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.CREATED, type: floor_entity_1.Floor }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FloorController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, type: [floor_entity_1.Floor] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FloorController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, type: floor_entity_1.Floor }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FloorController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, type: floor_entity_1.Floor }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FloorController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, type: floor_entity_1.Floor }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FloorController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)('building/:buildingId'),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, type: [floor_entity_1.Floor] }),
    __param(0, (0, common_1.Param)('buildingId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FloorController.prototype, "findByBuilding", null);
exports.FloorController = FloorController = __decorate([
    (0, common_1.Controller)('floors'),
    (0, swagger_1.ApiTags)('floors'),
    __metadata("design:paramtypes", [floor_service_1.FloorService])
], FloorController);
//# sourceMappingURL=floor.controller.js.map