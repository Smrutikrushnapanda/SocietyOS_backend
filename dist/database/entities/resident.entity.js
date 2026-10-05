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
exports.Resident = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
const organization_entity_1 = require("./organization.entity");
const flat_entity_1 = require("./flat.entity");
let Resident = class Resident {
    id;
    user_id;
    organization_id;
    flat_id;
    kyc_status;
    isActive;
    app_access_status;
    createdAt;
    updatedAt;
    user;
    organization;
    flat;
};
exports.Resident = Resident;
__decorate([
    (0, typeorm_1.PrimaryColumn)('uuid'),
    __metadata("design:type", String)
], Resident.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], Resident.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], Resident.prototype, "organization_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], Resident.prototype, "flat_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['PENDING', 'VERIFIED', 'REJECTED'],
        default: 'PENDING',
    }),
    __metadata("design:type", String)
], Resident.prototype, "kyc_status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Resident.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'boolean',
        default: false,
    }),
    __metadata("design:type", Boolean)
], Resident.prototype, "app_access_status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], Resident.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], Resident.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.userRoles),
    __metadata("design:type", user_entity_1.User)
], Resident.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => organization_entity_1.Organization, (org) => org.userRoles),
    __metadata("design:type", organization_entity_1.Organization)
], Resident.prototype, "organization", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => flat_entity_1.Flat, (flat) => flat.id),
    __metadata("design:type", flat_entity_1.Flat)
], Resident.prototype, "flat", void 0);
exports.Resident = Resident = __decorate([
    (0, typeorm_1.Entity)()
], Resident);
//# sourceMappingURL=resident.entity.js.map