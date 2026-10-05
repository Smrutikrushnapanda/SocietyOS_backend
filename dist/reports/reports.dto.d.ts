export declare const REPORT_DEFAULT_PAGE_SIZE = 25;
export declare const REPORT_MAX_PAGE_SIZE = 200;
export declare const RESIDENT_KYC_STATUSES: readonly ["PENDING", "VERIFIED", "REJECTED"];
export declare const VISITOR_VISIT_STATUSES: readonly ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "EXPIRED"];
export declare const MAINTENANCE_DUE_STATUSES: readonly ["PENDING", "OVERDUE", "PAID"];
export declare const PAYMENT_STATUSES: readonly ["PENDING", "COMPLETED", "FAILED", "REFUNDED"];
export declare const PAYMENT_METHODS: readonly ["CASH", "UPI", "NET_BANKING", "CHEQUE", "CARD"];
export declare const COMPLAINT_STATUSES: readonly ["OPEN", "IN_PROGRESS", "REJECTED", "RESOLVED", "CLOSED"];
export declare const COMPLAINT_PRIORITIES: readonly ["LOW", "MEDIUM", "HIGH"];
export declare const NOTICE_STATUSES: readonly ["DRAFT", "PUBLISHED", "ARCHIVED"];
export declare const POLL_STATUSES: readonly ["DRAFT", "PUBLISHED", "CLOSED"];
export declare const BOOLEAN_FILTERS: readonly ["true", "false"];
export declare class ReportPaginationDto {
    page: number;
    limit: number;
}
export declare class ReportDateRangeDto extends ReportPaginationDto {
    from?: string;
    to?: string;
}
export declare class ResidentsReportQueryDto extends ReportPaginationDto {
    kyc_status?: string;
    app_access?: string;
    active?: string;
    building_id?: string;
    floor_id?: string;
    flat_id?: string;
}
export declare class VisitorsReportQueryDto extends ReportDateRangeDto {
    visit_status?: string;
    visitor_id?: string;
}
export declare class MaintenanceDuesReportQueryDto extends ReportDateRangeDto {
    status?: string;
    flat_id?: string;
    building_id?: string;
    billing_period?: string;
    has_late_charge?: string;
}
export declare class PaymentsReportQueryDto extends ReportDateRangeDto {
    payment_status?: string;
    payment_method?: string;
    flat_id?: string;
    building_id?: string;
    resident_id?: string;
    maintenance_due_id?: string;
}
export declare class ComplaintsReportQueryDto extends ReportDateRangeDto {
    status?: string;
    priority?: string;
    category?: string;
    assigned_to?: string;
    flat_id?: string;
    building_id?: string;
}
export declare class NoticesReportQueryDto extends ReportDateRangeDto {
    status?: string;
}
export declare class PollsReportQueryDto extends ReportDateRangeDto {
    status?: string;
}
