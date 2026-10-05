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
exports.VisitorPass = void 0;
const typeorm_1 = require("typeorm");
const visitor_entity_1 = require("./visitor.entity");
const visitor_visit_entity_1 = require("./visitor-visit.entity");
let VisitorPass = class VisitorPass {
    id;
    organization_id;
    visitor_id;
    visitor_visit_id;
    issuer;
    pass_status;
    validity_start;
    validity_end;
    createdAt;
    updatedAt;
    visitor;
    visitor_visit;
};
exports.VisitorPass = VisitorPass;
__decorate([
    (0, typeorm_1.PrimaryColumn)('uuid'),
    __metadata("design:type", String)
], VisitorPass.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], VisitorPass.prototype, "organization_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], VisitorPass.prototype, "visitor_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], VisitorPass.prototype, "visitor_visit_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], VisitorPass.prototype, "issuer", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['ACTIVE', 'EXPIRED', 'REVOKED'],
        default: 'ACTIVE',
    }),
    __metadata("design:type", String)
], VisitorPass.prototype, "pass_status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], VisitorPass.prototype, "validity_start", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], VisitorPass.prototype, "validity_end", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], VisitorPass.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], VisitorPass.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => visitor_entity_1.Visitor, (visitor) => visitor.id),
    __metadata("design:type", visitor_entity_1.Visitor)
], VisitorPass.prototype, "visitor", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => visitor_visit_entity_1.VisitorVisit, (visit) => visit.id, { nullable: true }),
    __metadata("design:type", Object)
], VisitorPass.prototype, "visitor_visit", void 0);
exports.VisitorPass = VisitorPass = __decorate([
    (0, typeorm_1.Entity)()
], VisitorPass);
//# sourceMappingURL=visitor-pass.entity.js.map