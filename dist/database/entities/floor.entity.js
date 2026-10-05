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
exports.Floor = void 0;
const typeorm_1 = require("typeorm");
const building_entity_1 = require("./building.entity");
const flat_entity_1 = require("./flat.entity");
let Floor = class Floor {
    id;
    organization_id;
    building_id;
    floor_number;
    name;
    isActive;
    createdAt;
    updatedAt;
    building;
    flats;
};
exports.Floor = Floor;
__decorate([
    (0, typeorm_1.PrimaryColumn)('uuid'),
    __metadata("design:type", String)
], Floor.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], Floor.prototype, "organization_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], Floor.prototype, "building_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer' }),
    __metadata("design:type", Number)
], Floor.prototype, "floor_number", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255, nullable: true }),
    __metadata("design:type", String)
], Floor.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Floor.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], Floor.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], Floor.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => building_entity_1.Building, (building) => building.floors),
    __metadata("design:type", building_entity_1.Building)
], Floor.prototype, "building", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => flat_entity_1.Flat, (flat) => flat.floor),
    __metadata("design:type", Array)
], Floor.prototype, "flats", void 0);
exports.Floor = Floor = __decorate([
    (0, typeorm_1.Entity)()
], Floor);
//# sourceMappingURL=floor.entity.js.map