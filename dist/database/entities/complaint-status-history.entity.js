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
exports.ComplaintStatusHistory = void 0;
const typeorm_1 = require("typeorm");
const complaint_entity_1 = require("./complaint.entity");
const user_entity_1 = require("./user.entity");
let ComplaintStatusHistory = class ComplaintStatusHistory {
    id;
    complaint_id;
    previous_status;
    new_status;
    changed_by;
    changed_at;
    reason;
    complaint;
    changedByUser;
};
exports.ComplaintStatusHistory = ComplaintStatusHistory;
__decorate([
    (0, typeorm_1.PrimaryColumn)('uuid'),
    __metadata("design:type", String)
], ComplaintStatusHistory.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], ComplaintStatusHistory.prototype, "complaint_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20 }),
    __metadata("design:type", String)
], ComplaintStatusHistory.prototype, "previous_status", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20 }),
    __metadata("design:type", String)
], ComplaintStatusHistory.prototype, "new_status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], ComplaintStatusHistory.prototype, "changed_by", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], ComplaintStatusHistory.prototype, "changed_at", void 0);
__decorate([
    (0, typeorm_1.Column)('text'),
    __metadata("design:type", Object)
], ComplaintStatusHistory.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => complaint_entity_1.Complaint),
    __metadata("design:type", complaint_entity_1.Complaint)
], ComplaintStatusHistory.prototype, "complaint", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    __metadata("design:type", user_entity_1.User)
], ComplaintStatusHistory.prototype, "changedByUser", void 0);
exports.ComplaintStatusHistory = ComplaintStatusHistory = __decorate([
    (0, typeorm_1.Entity)()
], ComplaintStatusHistory);
//# sourceMappingURL=complaint-status-history.entity.js.map