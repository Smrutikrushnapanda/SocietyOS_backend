/**
 * Phase 10 - Step 4 (CSV Exports) response/contract types.
 */

/** HARD cap on exported data rows (the CSV header is not a data row). */
export const EXPORT_MAX_ROWS = 5000;

/** Result of a synchronous CSV export. */
export interface CsvExportResult {
  /** Stable, client-friendly file name, e.g. "residents.csv". */
  filename: string;
  /** Fully serialized CSV document (header row included). */
  csv: string;
  /** True only when MORE than EXPORT_MAX_ROWS records matched. */
  truncated: boolean;
  /** Number of data rows in the CSV (header excluded). */
  rowCount: number;
}

/** Stable filename per export (no organization id is ever exposed). */
export const EXPORT_FILENAMES = {
  residents: 'residents.csv',
  visitors: 'visitors.csv',
  'maintenance-dues': 'maintenance-dues.csv',
  payments: 'payments.csv',
  complaints: 'complaints.csv',
  notices: 'notices.csv',
  polls: 'polls.csv',
} as const;

export type ExportName = keyof typeof EXPORT_FILENAMES;

/**
 * Server-controlled, fixed column sets.
 *
 * There is NO `columns` query parameter and no client control over columns or
 * column order. These are the only columns that may ever be exported.
 */
export const EXPORT_COLUMNS = {
  residents: [
    'resident_id',
    'flat',
    'building',
    'floor',
    'kyc_status',
    'app_access_status',
    'is_active',
    'created_at',
  ],
  visitors: [
    'visitor_id',
    'visitor_name',
    'visitor_mobile',
    'visit_id',
    'visit_status',
    'visit_purpose',
    'approval_status',
    'pass_status',
    'expected_entry_time',
    'actual_entry_time',
    'created_at',
  ],
  'maintenance-dues': [
    'due_id',
    'flat',
    'building',
    'billing_period_start',
    'billing_period_end',
    'calculated_amount',
    'late_charge',
    'late_charge_waived',
    'due_date',
    'payment_received_at',
    'status',
  ],
  payments: [
    'payment_id',
    'flat',
    'building',
    'resident_id',
    'amount',
    'payment_method',
    'payment_status',
    'payment_date',
    'maintenance_due_id',
    'transaction_id',
  ],
  complaints: [
    'complaint_id',
    'category',
    'subject',
    'status',
    'priority',
    'resident_id',
    'flat',
    'building',
    'assigned_to',
    'created_at',
    'resolved_at',
  ],
  notices: [
    'notice_id',
    'title',
    'status',
    'published_at',
    'created_at',
    'updated_at',
  ],
  polls: [
    'poll_id',
    'title',
    'status',
    'starts_at',
    'ends_at',
    'option',
    'vote_count',
    'percentage',
    'total_votes',
  ],
} as const;

export type ExportRow = Record<string, unknown>;
