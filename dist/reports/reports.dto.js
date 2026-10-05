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
exports.PollsReportQueryDto = exports.NoticesReportQueryDto = exports.ComplaintsReportQueryDto = exports.PaymentsReportQueryDto = exports.MaintenanceDuesReportQueryDto = exports.VisitorsReportQueryDto = exports.ResidentsReportQueryDto = exports.ReportDateRangeDto = exports.ReportPaginationDto = exports.BOOLEAN_FILTERS = exports.POLL_STATUSES = exports.NOTICE_STATUSES = exports.COMPLAINT_PRIORITIES = exports.COMPLAINT_STATUSES = exports.PAYMENT_METHODS = exports.PAYMENT_STATUSES = exports.MAINTENANCE_DUE_STATUSES = exports.VISITOR_VISIT_STATUSES = exports.RESIDENT_KYC_STATUSES = exports.REPORT_MAX_PAGE_SIZE = exports.REPORT_DEFAULT_PAGE_SIZE = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
exports.REPORT_DEFAULT_PAGE_SIZE = 25;
exports.REPORT_MAX_PAGE_SIZE = 200;
exports.RESIDENT_KYC_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED'];
exports.VISITOR_VISIT_STATUSES = [
    'PENDING',
    'CONFIRMED',
    'COMPLETED',
    'CANCELLED',
    'EXPIRED',
];
exports.MAINTENANCE_DUE_STATUSES = [
    'PENDING',
    'OVERDUE',
    'PAID',
];
exports.PAYMENT_STATUSES = [
    'PENDING',
    'COMPLETED',
    'FAILED',
    'REFUNDED',
];
exports.PAYMENT_METHODS = [
    'CASH',
    'UPI',
    'NET_BANKING',
    'CHEQUE',
    'CARD',
];
exports.COMPLAINT_STATUSES = [
    'OPEN',
    'IN_PROGRESS',
    'REJECTED',
    'RESOLVED',
    'CLOSED',
];
exports.COMPLAINT_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];
exports.NOTICE_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];
exports.POLL_STATUSES = ['DRAFT', 'PUBLISHED', 'CLOSED'];
exports.BOOLEAN_FILTERS = ['true', 'false'];
const BILLING_PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
class ReportPaginationDto {
    page = 1;
    limit = exports.REPORT_DEFAULT_PAGE_SIZE;
}
exports.ReportPaginationDto = ReportPaginationDto;
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], ReportPaginationDto.prototype, "page", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(exports.REPORT_MAX_PAGE_SIZE),
    __metadata("design:type", Number)
], ReportPaginationDto.prototype, "limit", void 0);
class ReportDateRangeDto extends ReportPaginationDto {
    from;
    to;
}
exports.ReportDateRangeDto = ReportDateRangeDto;
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ReportDateRangeDto.prototype, "from", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ReportDateRangeDto.prototype, "to", void 0);
class ResidentsReportQueryDto extends ReportPaginationDto {
    kyc_status;
    app_access;
    active;
    building_id;
    floor_id;
    flat_id;
}
exports.ResidentsReportQueryDto = ResidentsReportQueryDto;
__decorate([
    (0, class_validator_1.IsIn)(exports.RESIDENT_KYC_STATUSES),
    __metadata("design:type", String)
], ResidentsReportQueryDto.prototype, "kyc_status", void 0);
__decorate([
    (0, class_validator_1.IsIn)(exports.BOOLEAN_FILTERS),
    __metadata("design:type", String)
], ResidentsReportQueryDto.prototype, "app_access", void 0);
__decorate([
    (0, class_validator_1.IsIn)(exports.BOOLEAN_FILTERS),
    __metadata("design:type", String)
], ResidentsReportQueryDto.prototype, "active", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ResidentsReportQueryDto.prototype, "building_id", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ResidentsReportQueryDto.prototype, "floor_id", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ResidentsReportQueryDto.prototype, "flat_id", void 0);
class VisitorsReportQueryDto extends ReportDateRangeDto {
    visit_status;
    visitor_id;
}
exports.VisitorsReportQueryDto = VisitorsReportQueryDto;
__decorate([
    (0, class_validator_1.IsIn)(exports.VISITOR_VISIT_STATUSES),
    __metadata("design:type", String)
], VisitorsReportQueryDto.prototype, "visit_status", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], VisitorsReportQueryDto.prototype, "visitor_id", void 0);
class MaintenanceDuesReportQueryDto extends ReportDateRangeDto {
    status;
    flat_id;
    building_id;
    billing_period;
    has_late_charge;
}
exports.MaintenanceDuesReportQueryDto = MaintenanceDuesReportQueryDto;
__decorate([
    (0, class_validator_1.IsIn)(exports.MAINTENANCE_DUE_STATUSES),
    __metadata("design:type", String)
], MaintenanceDuesReportQueryDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], MaintenanceDuesReportQueryDto.prototype, "flat_id", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], MaintenanceDuesReportQueryDto.prototype, "building_id", void 0);
__decorate([
    (0, class_validator_1.Matches)(BILLING_PERIOD_PATTERN),
    __metadata("design:type", String)
], MaintenanceDuesReportQueryDto.prototype, "billing_period", void 0);
__decorate([
    (0, class_validator_1.IsIn)(exports.BOOLEAN_FILTERS),
    __metadata("design:type", String)
], MaintenanceDuesReportQueryDto.prototype, "has_late_charge", void 0);
class PaymentsReportQueryDto extends ReportDateRangeDto {
    payment_status;
    payment_method;
    flat_id;
    building_id;
    resident_id;
    maintenance_due_id;
}
exports.PaymentsReportQueryDto = PaymentsReportQueryDto;
__decorate([
    (0, class_validator_1.IsIn)(exports.PAYMENT_STATUSES),
    __metadata("design:type", String)
], PaymentsReportQueryDto.prototype, "payment_status", void 0);
__decorate([
    (0, class_validator_1.IsIn)(exports.PAYMENT_METHODS),
    __metadata("design:type", String)
], PaymentsReportQueryDto.prototype, "payment_method", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], PaymentsReportQueryDto.prototype, "flat_id", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], PaymentsReportQueryDto.prototype, "building_id", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], PaymentsReportQueryDto.prototype, "resident_id", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], PaymentsReportQueryDto.prototype, "maintenance_due_id", void 0);
class ComplaintsReportQueryDto extends ReportDateRangeDto {
    status;
    priority;
    category;
    assigned_to;
    flat_id;
    building_id;
}
exports.ComplaintsReportQueryDto = ComplaintsReportQueryDto;
__decorate([
    (0, class_validator_1.IsIn)(exports.COMPLAINT_STATUSES),
    __metadata("design:type", String)
], ComplaintsReportQueryDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsIn)(exports.COMPLAINT_PRIORITIES),
    __metadata("design:type", String)
], ComplaintsReportQueryDto.prototype, "priority", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], ComplaintsReportQueryDto.prototype, "category", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ComplaintsReportQueryDto.prototype, "assigned_to", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ComplaintsReportQueryDto.prototype, "flat_id", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ComplaintsReportQueryDto.prototype, "building_id", void 0);
class NoticesReportQueryDto extends ReportDateRangeDto {
    status;
}
exports.NoticesReportQueryDto = NoticesReportQueryDto;
__decorate([
    (0, class_validator_1.IsIn)(exports.NOTICE_STATUSES),
    __metadata("design:type", String)
], NoticesReportQueryDto.prototype, "status", void 0);
class PollsReportQueryDto extends ReportDateRangeDto {
    status;
}
exports.PollsReportQueryDto = PollsReportQueryDto;
__decorate([
    (0, class_validator_1.IsIn)(exports.POLL_STATUSES),
    __metadata("design:type", String)
], PollsReportQueryDto.prototype, "status", void 0);
//# sourceMappingURL=reports.dto.js.map