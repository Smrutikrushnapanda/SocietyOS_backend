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
exports.MaintenanceConfiguration = void 0;
const typeorm_1 = require("typeorm");
const organization_entity_1 = require("./organization.entity");
let MaintenanceConfiguration = class MaintenanceConfiguration {
    id;
    organization_id;
    base_maintenance_amount;
    due_day_of_month;
    late_charge_type;
    late_charge_value;
    late_charge_grace_days;
    is_active;
    createdAt;
    updatedAt;
    organization;
};
exports.MaintenanceConfiguration = MaintenanceConfiguration;
__decorate([
    (0, typeorm_1.PrimaryColumn)('uuid'),
    __metadata("design:type", String)
], MaintenanceConfiguration.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], MaintenanceConfiguration.prototype, "organization_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 2000.0 }),
    __metadata("design:type", Number)
], MaintenanceConfiguration.prototype, "base_maintenance_amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer' }),
    __metadata("design:type", Number)
], MaintenanceConfiguration.prototype, "due_day_of_month", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20 }),
    __metadata("design:type", String)
], MaintenanceConfiguration.prototype, "late_charge_type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 100.0 }),
    __metadata("design:type", Number)
], MaintenanceConfiguration.prototype, "late_charge_value", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], MaintenanceConfiguration.prototype, "late_charge_grace_days", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], MaintenanceConfiguration.prototype, "is_active", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], MaintenanceConfiguration.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], MaintenanceConfiguration.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => organization_entity_1.Organization, (org) => org.userRoles),
    __metadata("design:type", organization_entity_1.Organization)
], MaintenanceConfiguration.prototype, "organization", void 0);
exports.MaintenanceConfiguration = MaintenanceConfiguration = __decorate([
    (0, typeorm_1.Entity)()
], MaintenanceConfiguration);
//# sourceMappingURL=maintenance-configuration.entity.js.map