/**
 * Phase 10 — Step 3 (Reports Foundation) response types.
 *
 * Every response is organization-scoped and contains ONLY report-safe fields.
 * No authentication data (mobile numbers, OTPs, refresh tokens, FCM tokens,
 * passwords) is ever part of a report response.
 */

export interface PaginatedReport<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BuildingOccupancyRow {
  id: string;
  name: string;
  code: string | null;
  is_active: boolean;
  floors: number;
  total_flats: number;
  occupied_flats: number;
  vacant_flats: number;
  occupancy_percentage: number;
}

export interface OccupancyTotals {
  buildings: number;
  floors: number;
  total_flats: number;
  occupied_flats: number;
  vacant_flats: number;
  occupancy_percentage: number;
}

export interface OccupancyReport {
  buildings: BuildingOccupancyRow[];
  totals: OccupancyTotals;
}

export interface ResidentReportRow {
  resident_id: string;
  kyc_status: string;
  app_access_status: boolean;
  is_active: boolean;
  flat: { id: string; flat_identifier: string | null } | null;
  building: { id: string; name: string | null } | null;
  floor: { id: string; floor_number: number | null } | null;
  created_at: Date | null;
  updated_at: Date | null;
}

export interface VisitorReportRow {
  visit_id: string;
  visitor: { id: string; name: string; mobile: string };
  visit_status: string;
  visit_purpose: string | null;
  expected_entry_time: Date | null;
  actual_entry_time: Date | null;
  approval_status: string | null;
  pass_status: string | null;
  created_at: Date | null;
  updated_at: Date | null;
}

export interface MaintenanceDueReportRow {
  due_id: string;
  status: string;
  flat: { id: string; flat_identifier: string | null };
  building: { id: string; name: string | null } | null;
  billing_period_start: Date | null;
  billing_period_end: Date | null;
  calculated_amount: unknown;
  late_charge: unknown;
  late_charge_waived: unknown;
  is_late_charge_waived: boolean;
  late_charge_waived_at: Date | null;
  due_date: Date | null;
  payment_received_at: Date | null;
  created_at: Date | null;
}

export interface PaymentReportRow {
  payment_id: string;
  amount: unknown;
  payment_method: string;
  payment_status: string;
  payment_date: Date | null;
  transaction_id: string | null;
  resident_id: string | null;
  flat: { id: string; flat_identifier: string | null } | null;
  building: { id: string; name: string | null } | null;
  maintenance_due: {
    id: string;
    status: string;
    billing_period_start: Date | null;
    billing_period_end: Date | null;
  } | null;
  created_at: Date | null;
}

export interface ComplaintReportRow {
  complaint_id: string;
  category: string;
  subject: string;
  status: string;
  priority: string;
  resident_id: string;
  assigned_to: string | null;
  flat: { id: string; flat_identifier: string | null };
  building: { id: string; name: string | null } | null;
  created_at: Date | null;
  resolved_at: Date | null;
  updated_at: Date | null;
}

export interface NoticeReportRow {
  notice_id: string;
  title: string;
  status: string;
  published_at: Date | null;
  created_at: Date | null;
  updated_at: Date | null;
}

export interface PollOptionResultRow {
  option_id: string;
  option_text: string;
  display_order: number;
  vote_count: number;
  percentage: number;
}

export interface PollReportRow {
  poll_id: string;
  title: string;
  status: string;
  starts_at: Date | null;
  ends_at: Date | null;
  created_at: Date | null;
  updated_at: Date | null;
  total_votes: number;
  options: PollOptionResultRow[];
}

/**
 * Shared filter contracts used by BOTH the read reports and the CSV exports.
 * They deliberately contain no organization scope and no pagination.
 */
export interface DateRangeFilters {
  from?: string;
  to?: string;
}

export interface ResidentsFilters extends DateRangeFilters {
  kyc_status?: string;
  app_access?: string;
  active?: string;
  building_id?: string;
  floor_id?: string;
  flat_id?: string;
}

export interface VisitorsFilters extends DateRangeFilters {
  visit_status?: string;
  visitor_id?: string;
}

export interface MaintenanceDuesFilters extends DateRangeFilters {
  status?: string;
  flat_id?: string;
  building_id?: string;
  billing_period?: string;
  has_late_charge?: string;
}

export interface PaymentsFilters extends DateRangeFilters {
  payment_status?: string;
  payment_method?: string;
  flat_id?: string;
  building_id?: string;
  resident_id?: string;
  maintenance_due_id?: string;
}

export interface ComplaintsFilters extends DateRangeFilters {
  status?: string;
  priority?: string;
  category?: string;
  assigned_to?: string;
  flat_id?: string;
  building_id?: string;
}

export interface NoticesFilters extends DateRangeFilters {
  status?: string;
}

export interface PollsFilters extends DateRangeFilters {
  status?: string;
}

/** Rows fetched with a hard bound (at most maxRows). */
export interface BoundedRows<T> {
  rows: T[];
  truncated: boolean;
}
