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
exports.VisitorApproval = void 0;
const typeorm_1 = require("typeorm");
const visitor_visit_entity_1 = require("./visitor-visit.entity");
let VisitorApproval = class VisitorApproval {
    id;
    organization_id;
    visitor_visit_id;
    approver_id;
    approval_status;
    approved_at;
    rejected_at;
    createdAt;
    updatedAt;
    visitor_visit;
};
exports.VisitorApproval = VisitorApproval;
__decorate([
    (0, typeorm_1.PrimaryColumn)('uuid'),
    __metadata("design:type", String)
], VisitorApproval.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], VisitorApproval.prototype, "organization_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], VisitorApproval.prototype, "visitor_visit_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], VisitorApproval.prototype, "approver_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: 'PENDING',
    }),
    __metadata("design:type", String)
], VisitorApproval.prototype, "approval_status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], VisitorApproval.prototype, "approved_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], VisitorApproval.prototype, "rejected_at", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], VisitorApproval.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], VisitorApproval.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => visitor_visit_entity_1.VisitorVisit, (visit) => visit.id),
    __metadata("design:type", visitor_visit_entity_1.VisitorVisit)
], VisitorApproval.prototype, "visitor_visit", void 0);
exports.VisitorApproval = VisitorApproval = __decorate([
    (0, typeorm_1.Entity)()
], VisitorApproval);
//# sourceMappingURL=visitor-approval.entity.js.map