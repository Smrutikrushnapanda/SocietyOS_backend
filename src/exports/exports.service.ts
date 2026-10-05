import { ForbiddenException, Injectable } from '@nestjs/common';
import { ReportsService } from '../reports/reports.service';
import { serializeCsv } from './csv-serializer';
import {
  ComplaintsExportQueryDto,
  MaintenanceDuesExportQueryDto,
  NoticesExportQueryDto,
  PaymentsExportQueryDto,
  PollsExportQueryDto,
  ResidentsExportQueryDto,
  VisitorsExportQueryDto,
} from './exports.dto';
import {
  CsvExportResult,
  EXPORT_COLUMNS,
  EXPORT_FILENAMES,
  EXPORT_MAX_ROWS,
  ExportRow,
} from './exports.types';

/**
 * Phase 10 - Step 4 (CSV Exports).
 *
 * READ-ONLY and SYNCHRONOUS:
 *  - no queue, no background job, no email, no streaming, no scheduling,
 *  - no AuditService: exports never create audit events (the approved audit
 *    event list stays exactly 48),
 *  - reuses ReportsService so there is a single query implementation; the
 *    HTTP report endpoints are never called,
 *  - organization scope is passed straight through from the resolved request
 *    context; this service has no organization input of its own.
 *
 * The fixed EXPORT_MAX_ROWS (5000) cap is enforced by ReportsService using a
 * fetch-one-extra strategy (LIMIT 5001), so memory stays bounded and
 * `truncated` is true only when MORE than 5000 records matched.
 */
@Injectable()
export class ExportsService {
  constructor(private readonly reportsService: ReportsService) {}

  async exportResidents(
    organizationId: string,
    filters: ResidentsExportQueryDto = new ResidentsExportQueryDto(),
  ): Promise<CsvExportResult> {
    this.assertOrganization(organizationId);
    const { rows, truncated } = await this.reportsService.fetchResidents(
      organizationId,
      filters,
      EXPORT_MAX_ROWS,
    );

    return this.toResult(
      'residents',
      rows.map((resident) => ({
        resident_id: resident.id,
        flat: resident.flat?.flat_identifier ?? null,
        building: resident.flat?.building?.name ?? null,
        floor: resident.flat?.floor?.floor_number ?? null,
        kyc_status: resident.kyc_status,
        app_access_status: resident.app_access_status,
        is_active: resident.isActive,
        created_at: resident.createdAt ?? null,
      })),
      truncated,
    );
  }

  async exportVisitors(
    organizationId: string,
    filters: VisitorsExportQueryDto = new VisitorsExportQueryDto(),
  ): Promise<CsvExportResult> {
    this.assertOrganization(organizationId);
    const { visits, approvals, passes, truncated } =
      await this.reportsService.fetchVisitors(organizationId, filters, EXPORT_MAX_ROWS);

    return this.toResult(
      'visitors',
      visits.map((visit) => ({
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
      })),
      truncated,
    );
  }

  async exportMaintenanceDues(
    organizationId: string,
    filters: MaintenanceDuesExportQueryDto = new MaintenanceDuesExportQueryDto(),
  ): Promise<CsvExportResult> {
    this.assertOrganization(organizationId);
    const { rows, truncated } = await this.reportsService.fetchMaintenanceDues(
      organizationId,
      filters,
      EXPORT_MAX_ROWS,
    );

    return this.toResult(
      'maintenance-dues',
      rows.map((due) => ({
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
      })),
      truncated,
    );
  }

  async exportPayments(
    organizationId: string,
    filters: PaymentsExportQueryDto = new PaymentsExportQueryDto(),
  ): Promise<CsvExportResult> {
    this.assertOrganization(organizationId);
    const { rows, truncated } = await this.reportsService.fetchPayments(
      organizationId,
      filters,
      EXPORT_MAX_ROWS,
    );

    return this.toResult(
      'payments',
      rows.map((payment) => ({
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
      })),
      truncated,
    );
  }

  async exportComplaints(
    organizationId: string,
    filters: ComplaintsExportQueryDto = new ComplaintsExportQueryDto(),
  ): Promise<CsvExportResult> {
    this.assertOrganization(organizationId);
    const { rows, truncated } = await this.reportsService.fetchComplaints(
      organizationId,
      filters,
      EXPORT_MAX_ROWS,
    );

    return this.toResult(
      'complaints',
      rows.map((complaint) => ({
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
      })),
      truncated,
    );
  }

  async exportNotices(
    organizationId: string,
    filters: NoticesExportQueryDto = new NoticesExportQueryDto(),
  ): Promise<CsvExportResult> {
    this.assertOrganization(organizationId);
    const { rows, truncated } = await this.reportsService.fetchNotices(
      organizationId,
      filters,
      EXPORT_MAX_ROWS,
    );

    return this.toResult(
      'notices',
      rows.map((notice) => ({
        notice_id: notice.id,
        title: notice.title,
        status: notice.status,
        published_at: notice.published_at ?? null,
        created_at: notice.created_at ?? null,
        updated_at: notice.updated_at ?? null,
      })),
      truncated,
    );
  }

  /**
   * Aggregate poll results only: one row per poll OPTION.
   * Individual votes and resident ids are never exported, so it is impossible
   * to tell which resident selected which option.
   */
  async exportPolls(
    organizationId: string,
    filters: PollsExportQueryDto = new PollsExportQueryDto(),
  ): Promise<CsvExportResult> {
    this.assertOrganization(organizationId);
    const { polls, optionRows, truncated } = await this.reportsService.fetchPolls(
      organizationId,
      filters,
      EXPORT_MAX_ROWS,
    );

    const records: ExportRow[] = [];
    for (const poll of polls) {
      const options = optionRows.filter((row) => row.poll_id === poll.id);
      const totalVotes = options.reduce(
        (sum, option) => sum + (Number(option.vote_count) || 0),
        0,
      );

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

    // The CSV row cap applies to data rows, so re-bound here as well.
    const rows = records.slice(0, EXPORT_MAX_ROWS);
    return this.toResult(
      'polls',
      rows,
      truncated || records.length > EXPORT_MAX_ROWS,
    );
  }

  private assertOrganization(organizationId: string | null | undefined): void {
    if (!organizationId) {
      // SUPER_ADMIN without a valid X-Organization-Id, or a user without an
      // organization membership.
      throw new ForbiddenException('Organization context is required');
    }
  }

  private toResult(
    name: keyof typeof EXPORT_COLUMNS,
    rows: ExportRow[],
    truncated: boolean,
  ): CsvExportResult {
    const csv = serializeCsv(EXPORT_COLUMNS[name], rows);
    return {
      filename: EXPORT_FILENAMES[name],
      csv,
      truncated,
      rowCount: rows.length,
    };
  }

  private percentage(part: number, total: number): number {
    if (!total || total <= 0) {
      return 0;
    }
    return Math.round((part / total) * 1000) / 10;
  }
}
