export declare const EXPORT_MAX_ROWS = 5000;
export interface CsvExportResult {
    filename: string;
    csv: string;
    truncated: boolean;
    rowCount: number;
}
export declare const EXPORT_FILENAMES: {
    readonly residents: "residents.csv";
    readonly visitors: "visitors.csv";
    readonly 'maintenance-dues': "maintenance-dues.csv";
    readonly payments: "payments.csv";
    readonly complaints: "complaints.csv";
    readonly notices: "notices.csv";
    readonly polls: "polls.csv";
};
export type ExportName = keyof typeof EXPORT_FILENAMES;
export declare const EXPORT_COLUMNS: {
    readonly residents: readonly ["resident_id", "flat", "building", "floor", "kyc_status", "app_access_status", "is_active", "created_at"];
    readonly visitors: readonly ["visitor_id", "visitor_name", "visitor_mobile", "visit_id", "visit_status", "visit_purpose", "approval_status", "pass_status", "expected_entry_time", "actual_entry_time", "created_at"];
    readonly 'maintenance-dues': readonly ["due_id", "flat", "building", "billing_period_start", "billing_period_end", "calculated_amount", "late_charge", "late_charge_waived", "due_date", "payment_received_at", "status"];
    readonly payments: readonly ["payment_id", "flat", "building", "resident_id", "amount", "payment_method", "payment_status", "payment_date", "maintenance_due_id", "transaction_id"];
    readonly complaints: readonly ["complaint_id", "category", "subject", "status", "priority", "resident_id", "flat", "building", "assigned_to", "created_at", "resolved_at"];
    readonly notices: readonly ["notice_id", "title", "status", "published_at", "created_at", "updated_at"];
    readonly polls: readonly ["poll_id", "title", "status", "starts_at", "ends_at", "option", "vote_count", "percentage", "total_votes"];
};
export type ExportRow = Record<string, unknown>;
