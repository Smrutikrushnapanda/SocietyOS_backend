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
exports.VisitorVisit = void 0;
const typeorm_1 = require("typeorm");
const visitor_entity_1 = require("./visitor.entity");
let VisitorVisit = class VisitorVisit {
    id;
    organization_id;
    visitor_id;
    visit_status;
    visit_purpose;
    expected_entry_time;
    actual_entry_time;
    createdAt;
    updatedAt;
    visitor;
};
exports.VisitorVisit = VisitorVisit;
__decorate([
    (0, typeorm_1.PrimaryColumn)('uuid'),
    __metadata("design:type", String)
], VisitorVisit.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], VisitorVisit.prototype, "organization_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], VisitorVisit.prototype, "visitor_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'EXPIRED'],
        default: 'PENDING',
    }),
    __metadata("design:type", String)
], VisitorVisit.prototype, "visit_status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], VisitorVisit.prototype, "visit_purpose", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], VisitorVisit.prototype, "expected_entry_time", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], VisitorVisit.prototype, "actual_entry_time", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], VisitorVisit.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], VisitorVisit.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => visitor_entity_1.Visitor, (visitor) => visitor.id),
    __metadata("design:type", visitor_entity_1.Visitor)
], VisitorVisit.prototype, "visitor", void 0);
exports.VisitorVisit = VisitorVisit = __decorate([
    (0, typeorm_1.Entity)()
], VisitorVisit);
//# sourceMappingURL=visitor-visit.entity.js.map