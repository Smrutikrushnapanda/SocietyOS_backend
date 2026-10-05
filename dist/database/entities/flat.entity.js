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
exports.Flat = void 0;
const typeorm_1 = require("typeorm");
const building_entity_1 = require("./building.entity");
const floor_entity_1 = require("./floor.entity");
const organization_entity_1 = require("./organization.entity");
let Flat = class Flat {
    id;
    organization_id;
    building_id;
    floor_id;
    flat_identifier;
    flat_type;
    maintenance_multiplier;
    isActive;
    createdAt;
    updatedAt;
    building;
    floor;
    organization;
};
exports.Flat = Flat;
__decorate([
    (0, typeorm_1.PrimaryColumn)('uuid'),
    __metadata("design:type", String)
], Flat.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], Flat.prototype, "organization_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], Flat.prototype, "building_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], Flat.prototype, "floor_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50 }),
    __metadata("design:type", String)
], Flat.prototype, "flat_identifier", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, nullable: true }),
    __metadata("design:type", String)
], Flat.prototype, "flat_type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 1.0 }),
    __metadata("design:type", Number)
], Flat.prototype, "maintenance_multiplier", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Flat.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], Flat.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], Flat.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => building_entity_1.Building, (building) => building.floors),
    __metadata("design:type", building_entity_1.Building)
], Flat.prototype, "building", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => floor_entity_1.Floor, (floor) => floor.flats),
    __metadata("design:type", floor_entity_1.Floor)
], Flat.prototype, "floor", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => organization_entity_1.Organization, (org) => org.userRoles),
    __metadata("design:type", organization_entity_1.Organization)
], Flat.prototype, "organization", void 0);
exports.Flat = Flat = __decorate([
    (0, typeorm_1.Entity)()
], Flat);
//# sourceMappingURL=flat.entity.js.map