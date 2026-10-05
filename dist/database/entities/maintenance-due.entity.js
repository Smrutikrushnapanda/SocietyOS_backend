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
exports.MaintenanceDue = void 0;
const typeorm_1 = require("typeorm");
const flat_entity_1 = require("./flat.entity");
const organization_entity_1 = require("./organization.entity");
const user_entity_1 = require("./user.entity");
let MaintenanceDue = class MaintenanceDue {
    id;
    flat_id;
    organization_id;
    base_maintenance_amount;
    maintenance_multiplier;
    calculated_amount;
    billing_period_start;
    billing_period_end;
    due_date;
    late_charge;
    late_charge_waived;
    late_charge_waived_by;
    late_charge_waived_at;
    late_charge_waiver_reason;
    status;
    payment_received_at;
    createdAt;
    updatedAt;
    flat;
    organization;
    waivedByUser;
};
exports.MaintenanceDue = MaintenanceDue;
__decorate([
    (0, typeorm_1.PrimaryColumn)('uuid'),
    __metadata("design:type", String)
], MaintenanceDue.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], MaintenanceDue.prototype, "flat_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], MaintenanceDue.prototype, "organization_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], MaintenanceDue.prototype, "base_maintenance_amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], MaintenanceDue.prototype, "maintenance_multiplier", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], MaintenanceDue.prototype, "calculated_amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", Date)
], MaintenanceDue.prototype, "billing_period_start", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", Date)
], MaintenanceDue.prototype, "billing_period_end", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", Date)
], MaintenanceDue.prototype, "due_date", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], MaintenanceDue.prototype, "late_charge", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], MaintenanceDue.prototype, "late_charge_waived", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], MaintenanceDue.prototype, "late_charge_waived_by", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], MaintenanceDue.prototype, "late_charge_waived_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], MaintenanceDue.prototype, "late_charge_waiver_reason", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, default: 'PENDING' }),
    __metadata("design:type", String)
], MaintenanceDue.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], MaintenanceDue.prototype, "payment_received_at", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], MaintenanceDue.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], MaintenanceDue.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => flat_entity_1.Flat, (flat) => flat.id),
    __metadata("design:type", flat_entity_1.Flat)
], MaintenanceDue.prototype, "flat", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => organization_entity_1.Organization, (org) => org.userRoles),
    __metadata("design:type", organization_entity_1.Organization)
], MaintenanceDue.prototype, "organization", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.userRoles),
    __metadata("design:type", Object)
], MaintenanceDue.prototype, "waivedByUser", void 0);
exports.MaintenanceDue = MaintenanceDue = __decorate([
    (0, typeorm_1.Entity)()
], MaintenanceDue);
//# sourceMappingURL=maintenance-due.entity.js.map