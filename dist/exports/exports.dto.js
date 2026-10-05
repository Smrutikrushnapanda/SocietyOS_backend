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
exports.PollsExportQueryDto = exports.NoticesExportQueryDto = exports.ComplaintsExportQueryDto = exports.PaymentsExportQueryDto = exports.MaintenanceDuesExportQueryDto = exports.VisitorsExportQueryDto = exports.ResidentsExportQueryDto = exports.ExportDateRangeDto = void 0;
const class_validator_1 = require("class-validator");
const reports_dto_1 = require("../reports/reports.dto");
const BILLING_PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
class ExportDateRangeDto {
    from;
    to;
}
exports.ExportDateRangeDto = ExportDateRangeDto;
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ExportDateRangeDto.prototype, "from", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ExportDateRangeDto.prototype, "to", void 0);
class ResidentsExportQueryDto {
    kyc_status;
    app_access;
    active;
    building_id;
    floor_id;
    flat_id;
}
exports.ResidentsExportQueryDto = ResidentsExportQueryDto;
__decorate([
    (0, class_validator_1.IsIn)(reports_dto_1.RESIDENT_KYC_STATUSES),
    __metadata("design:type", String)
], ResidentsExportQueryDto.prototype, "kyc_status", void 0);
__decorate([
    (0, class_validator_1.IsIn)(reports_dto_1.BOOLEAN_FILTERS),
    __metadata("design:type", String)
], ResidentsExportQueryDto.prototype, "app_access", void 0);
__decorate([
    (0, class_validator_1.IsIn)(reports_dto_1.BOOLEAN_FILTERS),
    __metadata("design:type", String)
], ResidentsExportQueryDto.prototype, "active", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ResidentsExportQueryDto.prototype, "building_id", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ResidentsExportQueryDto.prototype, "floor_id", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ResidentsExportQueryDto.prototype, "flat_id", void 0);
class VisitorsExportQueryDto extends ExportDateRangeDto {
    visit_status;
    visitor_id;
}
exports.VisitorsExportQueryDto = VisitorsExportQueryDto;
__decorate([
    (0, class_validator_1.IsIn)(reports_dto_1.VISITOR_VISIT_STATUSES),
    __metadata("design:type", String)
], VisitorsExportQueryDto.prototype, "visit_status", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], VisitorsExportQueryDto.prototype, "visitor_id", void 0);
class MaintenanceDuesExportQueryDto extends ExportDateRangeDto {
    status;
    flat_id;
    building_id;
    billing_period;
    has_late_charge;
}
exports.MaintenanceDuesExportQueryDto = MaintenanceDuesExportQueryDto;
__decorate([
    (0, class_validator_1.IsIn)(reports_dto_1.MAINTENANCE_DUE_STATUSES),
    __metadata("design:type", String)
], MaintenanceDuesExportQueryDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], MaintenanceDuesExportQueryDto.prototype, "flat_id", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], MaintenanceDuesExportQueryDto.prototype, "building_id", void 0);
__decorate([
    (0, class_validator_1.Matches)(BILLING_PERIOD_PATTERN),
    __metadata("design:type", String)
], MaintenanceDuesExportQueryDto.prototype, "billing_period", void 0);
__decorate([
    (0, class_validator_1.IsIn)(reports_dto_1.BOOLEAN_FILTERS),
    __metadata("design:type", String)
], MaintenanceDuesExportQueryDto.prototype, "has_late_charge", void 0);
class PaymentsExportQueryDto extends ExportDateRangeDto {
    payment_status;
    payment_method;
    flat_id;
    building_id;
    resident_id;
    maintenance_due_id;
}
exports.PaymentsExportQueryDto = PaymentsExportQueryDto;
__decorate([
    (0, class_validator_1.IsIn)(reports_dto_1.PAYMENT_STATUSES),
    __metadata("design:type", String)
], PaymentsExportQueryDto.prototype, "payment_status", void 0);
__decorate([
    (0, class_validator_1.IsIn)(reports_dto_1.PAYMENT_METHODS),
    __metadata("design:type", String)
], PaymentsExportQueryDto.prototype, "payment_method", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], PaymentsExportQueryDto.prototype, "flat_id", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], PaymentsExportQueryDto.prototype, "building_id", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], PaymentsExportQueryDto.prototype, "resident_id", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], PaymentsExportQueryDto.prototype, "maintenance_due_id", void 0);
class ComplaintsExportQueryDto extends ExportDateRangeDto {
    status;
    priority;
    category;
    assigned_to;
    flat_id;
    building_id;
}
exports.ComplaintsExportQueryDto = ComplaintsExportQueryDto;
__decorate([
    (0, class_validator_1.IsIn)(reports_dto_1.COMPLAINT_STATUSES),
    __metadata("design:type", String)
], ComplaintsExportQueryDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsIn)(reports_dto_1.COMPLAINT_PRIORITIES),
    __metadata("design:type", String)
], ComplaintsExportQueryDto.prototype, "priority", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], ComplaintsExportQueryDto.prototype, "category", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ComplaintsExportQueryDto.prototype, "assigned_to", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ComplaintsExportQueryDto.prototype, "flat_id", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ComplaintsExportQueryDto.prototype, "building_id", void 0);
class NoticesExportQueryDto extends ExportDateRangeDto {
    status;
}
exports.NoticesExportQueryDto = NoticesExportQueryDto;
__decorate([
    (0, class_validator_1.IsIn)(reports_dto_1.NOTICE_STATUSES),
    __metadata("design:type", String)
], NoticesExportQueryDto.prototype, "status", void 0);
class PollsExportQueryDto extends ExportDateRangeDto {
    status;
}
exports.PollsExportQueryDto = PollsExportQueryDto;
__decorate([
    (0, class_validator_1.IsIn)(reports_dto_1.POLL_STATUSES),
    __metadata("design:type", String)
], PollsExportQueryDto.prototype, "status", void 0);
//# sourceMappingURL=exports.dto.js.map