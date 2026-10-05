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
exports.Payment = void 0;
const typeorm_1 = require("typeorm");
const maintenance_due_entity_1 = require("./maintenance-due.entity");
const user_entity_1 = require("./user.entity");
const resident_entity_1 = require("./resident.entity");
const flat_entity_1 = require("./flat.entity");
const organization_entity_1 = require("./organization.entity");
let Payment = class Payment {
    id;
    organization_id;
    resident_id;
    flat_id;
    maintenance_due_id;
    amount;
    payment_method;
    payment_status;
    payment_date;
    transaction_id;
    created_by;
    created_at;
    updated_at;
    maintenance_due;
    createdByUser;
    resident;
    flat;
    organization;
};
exports.Payment = Payment;
__decorate([
    (0, typeorm_1.PrimaryColumn)('uuid'),
    __metadata("design:type", String)
], Payment.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], Payment.prototype, "organization_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], Payment.prototype, "resident_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], Payment.prototype, "flat_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], Payment.prototype, "maintenance_due_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], Payment.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20 }),
    __metadata("design:type", String)
], Payment.prototype, "payment_method", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20 }),
    __metadata("design:type", String)
], Payment.prototype, "payment_status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], Payment.prototype, "payment_date", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], Payment.prototype, "transaction_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], Payment.prototype, "created_by", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], Payment.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], Payment.prototype, "updated_at", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => maintenance_due_entity_1.MaintenanceDue, (due) => due.id),
    __metadata("design:type", maintenance_due_entity_1.MaintenanceDue)
], Payment.prototype, "maintenance_due", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.userRoles),
    __metadata("design:type", user_entity_1.User)
], Payment.prototype, "createdByUser", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => resident_entity_1.Resident, (resident) => resident.id),
    __metadata("design:type", Object)
], Payment.prototype, "resident", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => flat_entity_1.Flat, (flat) => flat.id),
    __metadata("design:type", Object)
], Payment.prototype, "flat", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => organization_entity_1.Organization, (org) => org.userRoles),
    __metadata("design:type", organization_entity_1.Organization)
], Payment.prototype, "organization", void 0);
exports.Payment = Payment = __decorate([
    (0, typeorm_1.Entity)()
], Payment);
//# sourceMappingURL=payment.entity.js.map