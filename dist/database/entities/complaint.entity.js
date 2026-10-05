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
exports.Complaint = void 0;
const typeorm_1 = require("typeorm");
const organization_entity_1 = require("./organization.entity");
const user_entity_1 = require("./user.entity");
const resident_entity_1 = require("./resident.entity");
const flat_entity_1 = require("./flat.entity");
let Complaint = class Complaint {
    id;
    organization_id;
    resident_id;
    flat_id;
    category;
    subject;
    description;
    status;
    priority;
    assigned_to;
    resolved_at;
    created_at;
    updated_at;
    organization;
    resident;
    flat;
    assignedToUser;
};
exports.Complaint = Complaint;
__decorate([
    (0, typeorm_1.PrimaryColumn)('uuid'),
    __metadata("design:type", String)
], Complaint.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], Complaint.prototype, "organization_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], Complaint.prototype, "resident_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], Complaint.prototype, "flat_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], Complaint.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], Complaint.prototype, "subject", void 0);
__decorate([
    (0, typeorm_1.Column)('text'),
    __metadata("design:type", String)
], Complaint.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, default: 'OPEN' }),
    __metadata("design:type", String)
], Complaint.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, default: 'MEDIUM' }),
    __metadata("design:type", String)
], Complaint.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], Complaint.prototype, "assigned_to", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], Complaint.prototype, "resolved_at", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], Complaint.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], Complaint.prototype, "updated_at", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => organization_entity_1.Organization),
    __metadata("design:type", organization_entity_1.Organization)
], Complaint.prototype, "organization", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => resident_entity_1.Resident),
    __metadata("design:type", resident_entity_1.Resident)
], Complaint.prototype, "resident", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => flat_entity_1.Flat),
    __metadata("design:type", flat_entity_1.Flat)
], Complaint.prototype, "flat", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    __metadata("design:type", user_entity_1.User)
], Complaint.prototype, "assignedToUser", void 0);
exports.Complaint = Complaint = __decorate([
    (0, typeorm_1.Entity)()
], Complaint);
//# sourceMappingURL=complaint.entity.js.map