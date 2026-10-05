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
exports.ExportsService = void 0;
const common_1 = require("@nestjs/common");
const reports_service_1 = require("../reports/reports.service");
const csv_serializer_1 = require("./csv-serializer");
const exports_dto_1 = require("./exports.dto");
const exports_types_1 = require("./exports.types");
let ExportsService = class ExportsService {
    reportsService;
    constructor(reportsService) {
        this.reportsService = reportsService;
    }
    async exportResidents(organizationId, filters = new exports_dto_1.ResidentsExportQueryDto()) {
        this.assertOrganization(organizationId);
        const { rows, truncated } = await this.reportsService.fetchResidents(organizationId, filters, exports_types_1.EXPORT_MAX_ROWS);
        return this.toResult('residents', rows.map((resident) => ({
            resident_id: resident.id,
            flat: resident.flat?.flat_identifier ?? null,
            building: resident.flat?.building?.name ?? null,
            floor: resident.flat?.floor?.floor_number ?? null,
            kyc_status: resident.kyc_status,
            app_access_status: resident.app_access_status,
            is_active: resident.isActive,
            created_at: resident.createdAt ?? null,
        })), truncated);
    }
    async exportVisitors(organizationId, filters = new exports_dto_1.VisitorsExportQueryDto()) {
        this.assertOrganization(organizationId);
        const { visits, approvals, passes, truncated } = await this.reportsService.fetchVisitors(organizationId, filters, exports_types_1.EXPORT_MAX_ROWS);
        return this.toResult('visitors', visits.map((visit) => ({
            visitor_id: visit.visitor.id,
            visitor_name: visit.visitor.name,
            visitor_mobile: visit.visitor.mobile,
            visit_id: visit.id,
            visit_status: visit.visit_status,
            visit_purpose: visit.visit_purpose ?? null,
            approval_status: approvals.get(visit.id)?.approval_status ?? null,
            pass_status: passes.get(visit.id)?.pass_status ?? null,
            expected_entry_time: visit.expected_entry_time ?? null,
            actual_entry_time: visit.actual_entry_time ?? null,
            created_at: visit.createdAt ?? null,
        })), truncated);
    }
    async exportMaintenanceDues(organizationId, filters = new exports_dto_1.MaintenanceDuesExportQueryDto()) {
        this.assertOrganization(organizationId);
        const { rows, truncated } = await this.reportsService.fetchMaintenanceDues(organizationId, filters, exports_types_1.EXPORT_MAX_ROWS);
        return this.toResult('maintenance-dues', rows.map((due) => ({
            due_id: due.id,
            flat: due.flat?.flat_identifier ?? null,
            building: due.flat?.building?.name ?? null,
            billing_period_start: due.billing_period_start ?? null,
            billing_period_end: due.billing_period_end ?? null,
            calculated_amount: due.calculated_amount,
            late_charge: due.late_charge,
            late_charge_waived: due.late_charge_waived,
            due_date: due.due_date ?? null,
            payment_received_at: due.payment_received_at ?? null,
            status: due.status,
        })), truncated);
    }
    async exportPayments(organizationId, filters = new exports_dto_1.PaymentsExportQueryDto()) {
        this.assertOrganization(organizationId);
        const { rows, truncated } = await this.reportsService.fetchPayments(organizationId, filters, exports_types_1.EXPORT_MAX_ROWS);
        return this.toResult('payments', rows.map((payment) => ({
            payment_id: payment.id,
            flat: payment.flat?.flat_identifier ?? null,
            building: payment.flat?.building?.name ?? null,
            resident_id: payment.resident_id ?? null,
            amount: payment.amount,
            payment_method: payment.payment_method,
            payment_status: payment.payment_status,
            payment_date: payment.payment_date ?? null,
            maintenance_due_id: payment.maintenance_due_id,
            transaction_id: payment.transaction_id ?? null,
        })), truncated);
    }
    async exportComplaints(organizationId, filters = new exports_dto_1.ComplaintsExportQueryDto()) {
        this.assertOrganization(organizationId);
        const { rows, truncated } = await this.reportsService.fetchComplaints(organizationId, filters, exports_types_1.EXPORT_MAX_ROWS);
        return this.toResult('complaints', rows.map((complaint) => ({
            complaint_id: complaint.id,
            category: complaint.category,
            subject: complaint.subject,
            status: complaint.status,
            priority: complaint.priority,
            resident_id: complaint.resident_id,
            flat: complaint.flat?.flat_identifier ?? null,
            building: complaint.flat?.building?.name ?? null,
            assigned_to: complaint.assigned_to ?? null,
            created_at: complaint.created_at ?? null,
            resolved_at: complaint.resolved_at ?? null,
        })), truncated);
    }
    async exportNotices(organizationId, filters = new exports_dto_1.NoticesExportQueryDto()) {
        this.assertOrganization(organizationId);
        const { rows, truncated } = await this.reportsService.fetchNotices(organizationId, filters, exports_types_1.EXPORT_MAX_ROWS);
        return this.toResult('notices', rows.map((notice) => ({
            notice_id: notice.id,
            title: notice.title,
            status: notice.status,
            published_at: notice.published_at ?? null,
            created_at: notice.created_at ?? null,
            updated_at: notice.updated_at ?? null,
        })), truncated);
    }
    async exportPolls(organizationId, filters = new exports_dto_1.PollsExportQueryDto()) {
        this.assertOrganization(organizationId);
        const { polls, optionRows, truncated } = await this.reportsService.fetchPolls(organizationId, filters, exports_types_1.EXPORT_MAX_ROWS);
        const records = [];
        for (const poll of polls) {
            const options = optionRows.filter((row) => row.poll_id === poll.id);
            const totalVotes = options.reduce((sum, option) => sum + (Number(option.vote_count) || 0), 0);
            for (const option of options) {
                const voteCount = Number(option.vote_count) || 0;
                records.push({
                    poll_id: poll.id,
                    title: poll.title,
                    status: poll.status,
                    starts_at: poll.starts_at ?? null,
                    ends_at: poll.ends_at ?? null,
                    option: option.option_text,
                    vote_count: voteCount,
                    percentage: this.percentage(voteCount, totalVotes),
                    total_votes: totalVotes,
                });
            }
        }
        const rows = records.slice(0, exports_types_1.EXPORT_MAX_ROWS);
        return this.toResult('polls', rows, truncated || records.length > exports_types_1.EXPORT_MAX_ROWS);
    }
    assertOrganization(organizationId) {
        if (!organizationId) {
            throw new common_1.ForbiddenException('Organization context is required');
        }
    }
    toResult(name, rows, truncated) {
        const csv = (0, csv_serializer_1.serializeCsv)(exports_types_1.EXPORT_COLUMNS[name], rows);
        return {
            filename: exports_types_1.EXPORT_FILENAMES[name],
            csv,
            truncated,
            rowCount: rows.length,
        };
    }
    percentage(part, total) {
        if (!total || total <= 0) {
            return 0;
        }
        return Math.round((part / total) * 1000) / 10;
    }
};
exports.ExportsService = ExportsService;
exports.ExportsService = ExportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [reports_service_1.ReportsService])
], ExportsService);
//# sourceMappingURL=exports.service.js.map