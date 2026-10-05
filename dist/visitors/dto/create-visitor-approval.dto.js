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
exports.CreateVisitorApprovalDto = void 0;
const class_validator_1 = require("class-validator");
const approval_status_enum_1 = require("../enum/approval-status.enum");
class CreateVisitorApprovalDto {
    visitor_visit_id;
    approval_status;
    approver_id;
    approved_at;
    rejected_at;
    organization_id;
}
exports.CreateVisitorApprovalDto = CreateVisitorApprovalDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateVisitorApprovalDto.prototype, "visitor_visit_id", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(approval_status_enum_1.ApprovalStatus),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateVisitorApprovalDto.prototype, "approval_status", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateVisitorApprovalDto.prototype, "approver_id", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateVisitorApprovalDto.prototype, "approved_at", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateVisitorApprovalDto.prototype, "rejected_at", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateVisitorApprovalDto.prototype, "organization_id", void 0);
//# sourceMappingURL=create-visitor-approval.dto.js.map