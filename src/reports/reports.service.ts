import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { DataSource, SelectQueryBuilder } from 'typeorm';
import { Building } from '../database/entities/building.entity';
import { Floor } from '../database/entities/floor.entity';
import { Flat } from '../database/entities/flat.entity';
import { Resident } from '../database/entities/resident.entity';
import { Visitor } from '../database/entities/visitor.entity';
import { VisitorVisit } from '../database/entities/visitor-visit.entity';
import { VisitorApproval } from '../database/entities/visitor-approval.entity';
import { VisitorPass } from '../database/entities/visitor-pass.entity';
import { MaintenanceDue } from '../database/entities/maintenance-due.entity';
import { Payment } from '../database/entities/payment.entity';
import { Complaint } from '../database/entities/complaint.entity';
import { Notice } from '../database/entities/notice.entity';
import { Poll } from '../database/entities/poll.entity';
import { PollOption } from '../database/entities/poll-option.entity';
import { PollVote } from '../database/entities/poll-vote.entity';
import {
  COMPLAINT_PRIORITIES,
  COMPLAINT_STATUSES,
  ComplaintsReportQueryDto,
  MAINTENANCE_DUE_STATUSES,
  MaintenanceDuesReportQueryDto,
  NOTICE_STATUSES,
  NoticesReportQueryDto,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  PaymentsReportQueryDto,
  POLL_STATUSES,
  PollsReportQueryDto,
  REPORT_DEFAULT_PAGE_SIZE,
  REPORT_MAX_PAGE_SIZE,
  RESIDENT_KYC_STATUSES,
  ResidentsReportQueryDto,
  VISITOR_VISIT_STATUSES,
  VisitorsReportQueryDto,
} from './reports.dto';
import {
  BoundedRows,
  BuildingOccupancyRow,
  ComplaintReportRow,
  ComplaintsFilters,
  MaintenanceDueReportRow,
  MaintenanceDuesFilters,
  NoticeReportRow,
  NoticesFilters,
  OccupancyReport,
  PaginatedReport,
  PaymentReportRow,
  PaymentsFilters,
  PollReportRow,
  PollsFilters,
  ResidentReportRow,
  ResidentsFilters,
  VisitorReportRow,
  VisitorsFilters,
} from './reports.types';

const BILLING_PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const ISO_DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

/** Aggregated poll option row (raw SQL shape) used by the report and export. */
export interface PollOptionCountRow {
  option_id: string;
  poll_id: string;
  option_text: string;
  display_order: string | number;
  vote_count: string;
}

/** Bounded visitor source rows for exports (visits + latest approval/pass). */
export interface BoundedVisitorRows {
  visits: VisitorVisit[];
  approvals: Map<string, VisitorApproval>;
  passes: Map<string, VisitorPass>;
  truncated: boolean;
}

/** Bounded poll source rows for exports (polls + aggregated option counts). */
export interface BoundedPollRows {
  polls: Poll[];
  optionRows: PollOptionCountRow[];
  truncated: boolean;
}

/**
 * Phase 10 - Step 3 (Reports Foundation) + shared query source for Step 4.
 *
 * READ-ONLY service:
 *  - every query is organization-scoped at the database query level using the
 *    organization resolved by OrganizationContextService (never client input),
 *  - filtering and pagination are server-side,
 *  - no AuditService is injected/used: report reads, filters, pagination and
 *    CSV exports never create audit events (only the 48 mutation events do),
 *  - responses contain report-safe fields only (no auth data).
 *
 * The per-entity query builders are shared by the read reports (paginated,
 * unchanged behavior) and by the bounded fetch*() methods used by the CSV
 * exports, so there is only ONE reporting/query implementation.
 */
@Injectable()
export class ReportsService {
  constructor(private readonly dataSource: DataSource) {}

  // ------------------------------------------------------------------ //
  // GET /reports/occupancy                                              //
  // ------------------------------------------------------------------ //
  /**
   * Occupancy aggregate built from the existing Phase 5 structure.
   *
   * occupied = a flat with at least one ACTIVE resident (isActive = true).
   * A flat is counted once even when several active residents exist for it
   * (COUNT(DISTINCT ...) in SQL, never once per resident in JavaScript).
   */
  async getOccupancy(organizationId: string): Promise<OccupancyReport> {
    this.assertOrganization(organizationId);

    const buildings = await this.dataSource
      .getRepository(Building)
      .createQueryBuilder('building')
      .where('building.organization_id = :organizationId', { organizationId })
      .orderBy('building.name', 'ASC')
      .getMany();

    const floorCountRows = await this.dataSource
      .getRepository(Floor)
      .createQueryBuilder('floor')
      .select('floor.building_id', 'building_id')
      .addSelect('COUNT(floor.id)', 'floor_count')
      .where('floor.organization_id = :organizationId', { organizationId })
      .groupBy('floor.building_id')
      .getRawMany<{ building_id: string; floor_count: string }>();

    const flatCountRows = await this.dataSource
      .getRepository(Flat)
      .createQueryBuilder('flat')
      .select('flat.building_id', 'building_id')
      .addSelect('COUNT(flat.id)', 'total_flats')
      .addSelect('COUNT(DISTINCT occupied.flat_id)', 'occupied_flats')
      .leftJoin(
        Resident,
        'occupied',
        'occupied.flat_id = flat.id AND occupied.organization_id = flat.organization_id AND occupied.isActive = true',
      )
      .where('flat.organization_id = :organizationId', { organizationId })
      .groupBy('flat.building_id')
      .getRawMany<{
        building_id: string;
        total_flats: string;
        occupied_flats: string;
      }>();

    const floorsByBuilding = new Map<string, number>();
    for (const row of floorCountRows ?? []) {
      floorsByBuilding.set(row.building_id, Number(row.floor_count) || 0);
    }

    const flatsByBuilding = new Map<string, { total: number; occupied: number }>();
    for (const row of flatCountRows ?? []) {
      flatsByBuilding.set(row.building_id, {
        total: Number(row.total_flats) || 0,
        occupied: Number(row.occupied_flats) || 0,
      });
    }

    const rows: BuildingOccupancyRow[] = buildings.map((building) => {
      const counts = flatsByBuilding.get(building.id) ?? { total: 0, occupied: 0 };
      const floors = floorsByBuilding.get(building.id) ?? 0;
      const vacant = Math.max(counts.total - counts.occupied, 0);
      return {
        id: building.id,
        name: building.name,
        code: building.code ?? null,
        is_active: building.isActive,
        floors,
        total_flats: counts.total,
        occupied_flats: counts.occupied,
        vacant_flats: vacant,
        occupancy_percentage: this.percentage(counts.occupied, counts.total),
      };
    });

    const totalFlats = rows.reduce((sum, row) => sum + row.total_flats, 0);
    const occupiedFlats = rows.reduce((sum, row) => sum + row.occupied_flats, 0);
    const totalFloors = rows.reduce((sum, row) => sum + row.floors, 0);

    return {
      buildings: rows,
      totals: {
        buildings: rows.length,
        floors: totalFloors,
        total_flats: totalFlats,
        occupied_flats: occupiedFlats,
        vacant_flats: Math.max(totalFlats - occupiedFlats, 0),
        occupancy_percentage: this.percentage(occupiedFlats, totalFlats),
      },
    };
  }

  // ------------------------------------------------------------------ //
  // GET /reports/residents                                              //
  // ------------------------------------------------------------------ //
  /**
   * Report-safe resident fields only. The User relation is deliberately NOT
   * joined: resident.mobileNumber, refreshTokenId, isAuthenticated and every
   * other authentication field can never enter a report response.
   */
  async getResidents(
    organizationId: string,
    filters: ResidentsReportQueryDto = new ResidentsReportQueryDto(),
  ): Promise<PaginatedReport<ResidentReportRow>> {
    const { page, limit, skip } = this.resolvePagination(filters);
    const query = this.buildResidentsQuery(organizationId, filters);

    query.orderBy('resident.createdAt', 'DESC').skip(skip).take(limit);

    const [rows, total] = await query.getManyAndCount();

    const items: ResidentReportRow[] = rows.map((resident) => {
      const flat = resident.flat ?? null;
      return {
        resident_id: resident.id,
        kyc_status: resident.kyc_status,
        app_access_status: resident.app_access_status,
        is_active: resident.isActive,
        flat: resident.flat_id
          ? {
              id: resident.flat_id,
              flat_identifier: flat?.flat_identifier ?? null,
            }
          : null,
        building: flat
          ? { id: flat.building_id, name: flat.building?.name ?? null }
          : null,
        floor: flat
          ? { id: flat.floor_id, floor_number: flat.floor?.floor_number ?? null }
          : null,
        created_at: resident.createdAt ?? null,
        updated_at: resident.updatedAt ?? null,
      };
    });

    return this.toPage(items, total, page, limit);
  }

  /** Bounded, deterministically ordered resident rows (CSV export source). */
  async fetchResidents(
    organizationId: string,
    filters: ResidentsFilters = {},
    maxRows: number,
  ): Promise<BoundedRows<Resident>> {
    const query = this.buildResidentsQuery(organizationId, filters);
    query
      .orderBy('resident.createdAt', 'DESC')
      .addOrderBy('resident.id', 'DESC')
      .take(maxRows + 1);

    return this.bounded(await query.getMany(), maxRows);
  }

  private buildResidentsQuery(
    organizationId: string,
    filters: ResidentsFilters,
  ): SelectQueryBuilder<Resident> {
    this.assertOrganization(organizationId);

    const query = this.dataSource
      .getRepository(Resident)
      .createQueryBuilder('resident')
      .leftJoinAndSelect('resident.flat', 'flat')
      .leftJoinAndSelect('flat.building', 'building')
      .leftJoinAndSelect('flat.floor', 'floor')
      .where('resident.organization_id = :organizationId', { organizationId })
      .andWhere('(flat.id IS NULL OR flat.organization_id = :organizationId)');

    const kycStatus = this.parseEnumFilter(
      filters.kyc_status,
      RESIDENT_KYC_STATUSES,
      'kyc_status',
    );
    if (kycStatus) {
      query.andWhere('resident.kyc_status = :kycStatus', { kycStatus });
    }

    const appAccess = this.parseBooleanFilter(filters.app_access, 'app_access');
    if (appAccess !== undefined) {
      query.andWhere('resident.app_access_status = :appAccess', { appAccess });
    }

    const isActive = this.parseBooleanFilter(filters.active, 'active');
    if (isActive !== undefined) {
      query.andWhere('resident.isActive = :isActive', { isActive });
    }

    if (filters.flat_id) {
      query.andWhere('resident.flat_id = :flatId', { flatId: filters.flat_id });
    }
    if (filters.building_id) {
      query.andWhere('flat.building_id = :buildingId', {
        buildingId: filters.building_id,
      });
    }
    if (filters.floor_id) {
      query.andWhere('flat.floor_id = :floorId', { floorId: filters.floor_id });
    }

    return query;
  }

  // ------------------------------------------------------------------ //
  // GET /reports/visitors                                               //
  // ------------------------------------------------------------------ //
  /**
   * One row per visitor VISIT (visitor identity is not duplicated).
   * visitor.mobile is allowed by the approved specification; OTP / FCM token
   * / refresh token / auth secrets are not exposed.
   */
  async getVisitors(
    organizationId: string,
    filters: VisitorsReportQueryDto = new VisitorsReportQueryDto(),
  ): Promise<PaginatedReport<VisitorReportRow>> {
    const { page, limit, skip } = this.resolvePagination(filters);
    const query = this.buildVisitorsQuery(organizationId, filters);

    query.orderBy('visit.createdAt', 'DESC').skip(skip).take(limit);

    const [rows, total] = await query.getManyAndCount();
    const { approvals, passes } = await this.loadVisitContext(
      organizationId,
      rows.map((visit) => visit.id),
    );

    const items: VisitorReportRow[] = rows.map((visit) => ({
      visit_id: visit.id,
      visitor: {
        id: visit.visitor.id,
        name: visit.visitor.name,
        mobile: visit.visitor.mobile,
      },
      visit_status: visit.visit_status,
      visit_purpose: visit.visit_purpose ?? null,
      expected_entry_time: visit.expected_entry_time ?? null,
      actual_entry_time: visit.actual_entry_time ?? null,
      approval_status: approvals.get(visit.id)?.approval_status ?? null,
      pass_status: passes.get(visit.id)?.pass_status ?? null,
      created_at: visit.createdAt ?? null,
      updated_at: visit.updatedAt ?? null,
    }));

    return this.toPage(items, total, page, limit);
  }

  /** Bounded, deterministically ordered visit rows (CSV export source). */
  async fetchVisitors(
    organizationId: string,
    filters: VisitorsFilters = {},
    maxRows: number,
  ): Promise<BoundedVisitorRows> {
    const query = this.buildVisitorsQuery(organizationId, filters);
    query
      .orderBy('visit.createdAt', 'DESC')
      .addOrderBy('visit.id', 'DESC')
      .take(maxRows + 1);

    const fetched = await query.getMany();
    const visits = fetched.slice(0, maxRows);
    const truncated = fetched.length > maxRows;
    const { approvals, passes } = await this.loadVisitContext(
      organizationId,
      visits.map((visit) => visit.id),
    );

    return { visits, approvals, passes, truncated };
  }

  private buildVisitorsQuery(
    organizationId: string,
    filters: VisitorsFilters,
  ): SelectQueryBuilder<VisitorVisit> {
    this.assertOrganization(organizationId);
    const { from, to } = this.resolveDateRange(filters);

    const query = this.dataSource
      .getRepository(VisitorVisit)
      .createQueryBuilder('visit')
      .leftJoinAndSelect('visit.visitor', 'visitor')
      .where('visit.organization_id = :organizationId', { organizationId })
      .andWhere('visitor.organization_id = :organizationId');

    const visitStatus = this.parseEnumFilter(
      filters.visit_status,
      VISITOR_VISIT_STATUSES,
      'visit_status',
    );
    if (visitStatus) {
      query.andWhere('visit.visit_status = :visitStatus', { visitStatus });
    }
    if (filters.visitor_id) {
      query.andWhere('visit.visitor_id = :visitorId', {
        visitorId: filters.visitor_id,
      });
    }
    if (from) {
      query.andWhere('visit.createdAt >= :from', { from });
    }
    if (to) {
      query.andWhere('visit.createdAt <= :to', { to });
    }

    return query;
  }

  /** Latest approval / pass per visit. Batched (2 queries, never N+1). */
  private async loadVisitContext(
    organizationId: string,
    visitIds: string[],
  ): Promise<{
    approvals: Map<string, VisitorApproval>;
    passes: Map<string, VisitorPass>;
  }> {
    const approvals = new Map<string, VisitorApproval>();
    const passes = new Map<string, VisitorPass>();

    if (visitIds.length > 0) {
      const approvalRows = await this.dataSource
        .getRepository(VisitorApproval)
        .createQueryBuilder('approval')
        .where('approval.organization_id = :organizationId', {
          organizationId,
        })
        .andWhere('approval.visitor_visit_id IN (:...visitIds)', { visitIds })
        .orderBy('approval.createdAt', 'DESC')
        .getMany();
      for (const approval of approvalRows) {
        if (!approvals.has(approval.visitor_visit_id)) {
          approvals.set(approval.visitor_visit_id, approval);
        }
      }

      const passRows = await this.dataSource
        .getRepository(VisitorPass)
        .createQueryBuilder('pass')
        .where('pass.organization_id = :organizationId', { organizationId })
        .andWhere('pass.visitor_visit_id IN (:...visitIds)', { visitIds })
        .orderBy('pass.createdAt', 'DESC')
        .getMany();
      for (const pass of passRows) {
        if (pass.visitor_visit_id && !passes.has(pass.visitor_visit_id)) {
          passes.set(pass.visitor_visit_id, pass);
        }
      }
    }

    return { approvals, passes };
  }

  // ------------------------------------------------------------------ //
  // GET /reports/maintenance-dues                                       //
  // ------------------------------------------------------------------ //
  /**
   * Reports the PERSISTED snapshot fields of maintenance dues.
   * No maintenance calculation logic runs here and historical dues are never
   * recalculated or re-generated.
   */
  async getMaintenanceDues(
    organizationId: string,
    filters: MaintenanceDuesReportQueryDto = new MaintenanceDuesReportQueryDto(),
  ): Promise<PaginatedReport<MaintenanceDueReportRow>> {
    const { page, limit, skip } = this.resolvePagination(filters);
    const query = this.buildMaintenanceDuesQuery(organizationId, filters);

    query.orderBy('due.due_date', 'DESC').skip(skip).take(limit);

    const [rows, total] = await query.getManyAndCount();

    const items: MaintenanceDueReportRow[] = rows.map((due) => ({
      due_id: due.id,
      status: due.status,
      flat: {
        id: due.flat_id,
        flat_identifier: due.flat?.flat_identifier ?? null,
      },
      building: due.flat
        ? { id: due.flat.building_id, name: due.flat.building?.name ?? null }
        : null,
      billing_period_start: due.billing_period_start ?? null,
      billing_period_end: due.billing_period_end ?? null,
      calculated_amount: due.calculated_amount,
      late_charge: due.late_charge,
      late_charge_waived: due.late_charge_waived,
      is_late_charge_waived: Number(due.late_charge_waived ?? 0) > 0,
      late_charge_waived_at: due.late_charge_waived_at ?? null,
      due_date: due.due_date ?? null,
      payment_received_at: due.payment_received_at ?? null,
      created_at: due.createdAt ?? null,
    }));

    return this.toPage(items, total, page, limit);
  }

  /** Bounded, deterministically ordered due rows (CSV export source). */
  async fetchMaintenanceDues(
    organizationId: string,
    filters: MaintenanceDuesFilters = {},
    maxRows: number,
  ): Promise<BoundedRows<MaintenanceDue>> {
    const query = this.buildMaintenanceDuesQuery(organizationId, filters);
    query
      .orderBy('due.due_date', 'DESC')
      .addOrderBy('due.id', 'DESC')
      .take(maxRows + 1);

    return this.bounded(await query.getMany(), maxRows);
  }

  private buildMaintenanceDuesQuery(
    organizationId: string,
    filters: MaintenanceDuesFilters,
  ): SelectQueryBuilder<MaintenanceDue> {
    this.assertOrganization(organizationId);
    const { from, to } = this.resolveDateRange(filters);

    const status = this.parseEnumFilter(
      filters.status,
      MAINTENANCE_DUE_STATUSES,
      'status',
    );
    const hasLateCharge = this.parseBooleanFilter(
      filters.has_late_charge,
      'has_late_charge',
    );
    if (
      filters.billing_period &&
      !BILLING_PERIOD_PATTERN.test(filters.billing_period)
    ) {
      throw new BadRequestException('Invalid billing_period filter');
    }

    const query = this.dataSource
      .getRepository(MaintenanceDue)
      .createQueryBuilder('due')
      .leftJoinAndSelect('due.flat', 'flat')
      .leftJoinAndSelect('flat.building', 'building')
      .where('due.organization_id = :organizationId', { organizationId })
      .andWhere('(flat.id IS NULL OR flat.organization_id = :organizationId)');

    if (status) {
      query.andWhere('due.status = :status', { status });
    }
    if (filters.flat_id) {
      query.andWhere('due.flat_id = :flatId', { flatId: filters.flat_id });
    }
    if (filters.building_id) {
      query.andWhere('flat.building_id = :buildingId', {
        buildingId: filters.building_id,
      });
    }
    if (from) {
      query.andWhere('due.due_date >= :from', { from });
    }
    if (to) {
      query.andWhere('due.due_date <= :to', { to });
    }
    if (filters.billing_period) {
      query.andWhere('due.billing_period_start = :billingPeriodStart', {
        billingPeriodStart: `${filters.billing_period}-01`,
      });
    }
    if (hasLateCharge === true) {
      query.andWhere('due.late_charge > 0');
    }
    if (hasLateCharge === false) {
      query.andWhere('due.late_charge = 0');
    }

    return query;
  }

  // ------------------------------------------------------------------ //
  // GET /reports/payments                                               //
  // ------------------------------------------------------------------ //
  /** Payment report. No gateway logic, no reconciliation, no auth data. */
  async getPayments(
    organizationId: string,
    filters: PaymentsReportQueryDto = new PaymentsReportQueryDto(),
  ): Promise<PaginatedReport<PaymentReportRow>> {
    const { page, limit, skip } = this.resolvePagination(filters);
    const query = this.buildPaymentsQuery(organizationId, filters);

    query.orderBy('payment.payment_date', 'DESC').skip(skip).take(limit);

    const [rows, total] = await query.getManyAndCount();

    const items: PaymentReportRow[] = rows.map((payment) => ({
      payment_id: payment.id,
      amount: payment.amount,
      payment_method: payment.payment_method,
      payment_status: payment.payment_status,
      payment_date: payment.payment_date ?? null,
      transaction_id: payment.transaction_id ?? null,
      resident_id: payment.resident_id ?? null,
      flat: payment.flat_id
        ? {
            id: payment.flat_id,
            flat_identifier: payment.flat?.flat_identifier ?? null,
          }
        : null,
      building: payment.flat
        ? {
            id: payment.flat.building_id,
            name: payment.flat.building?.name ?? null,
          }
        : null,
      maintenance_due: payment.maintenance_due
        ? {
            id: payment.maintenance_due.id,
            status: payment.maintenance_due.status,
            billing_period_start:
              payment.maintenance_due.billing_period_start ?? null,
            billing_period_end: payment.maintenance_due.billing_period_end ?? null,
          }
        : null,
      created_at: payment.created_at ?? null,
    }));

    return this.toPage(items, total, page, limit);
  }

  /** Bounded, deterministically ordered payment rows (CSV export source). */
  async fetchPayments(
    organizationId: string,
    filters: PaymentsFilters = {},
    maxRows: number,
  ): Promise<BoundedRows<Payment>> {
    const query = this.buildPaymentsQuery(organizationId, filters);
    query
      .orderBy('payment.payment_date', 'DESC')
      .addOrderBy('payment.id', 'DESC')
      .take(maxRows + 1);

    return this.bounded(await query.getMany(), maxRows);
  }

  private buildPaymentsQuery(
    organizationId: string,
    filters: PaymentsFilters,
  ): SelectQueryBuilder<Payment> {
    this.assertOrganization(organizationId);
    const { from, to } = this.resolveDateRange(filters);

    const paymentStatus = this.parseEnumFilter(
      filters.payment_status,
      PAYMENT_STATUSES,
      'payment_status',
    );
    const paymentMethod = this.parseEnumFilter(
      filters.payment_method,
      PAYMENT_METHODS,
      'payment_method',
    );

    const query = this.dataSource
      .getRepository(Payment)
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.flat', 'flat')
      .leftJoinAndSelect('flat.building', 'building')
      .leftJoinAndSelect('payment.maintenance_due', 'due')
      .where('payment.organization_id = :organizationId', { organizationId })
      .andWhere('(flat.id IS NULL OR flat.organization_id = :organizationId)')
      .andWhere('(due.id IS NULL OR due.organization_id = :organizationId)');

    if (paymentStatus) {
      query.andWhere('payment.payment_status = :paymentStatus', {
        paymentStatus,
      });
    }
    if (paymentMethod) {
      query.andWhere('payment.payment_method = :paymentMethod', {
        paymentMethod,
      });
    }
    if (filters.flat_id) {
      query.andWhere('payment.flat_id = :flatId', { flatId: filters.flat_id });
    }
    if (filters.building_id) {
      query.andWhere('flat.building_id = :buildingId', {
        buildingId: filters.building_id,
      });
    }
    if (filters.resident_id) {
      query.andWhere('payment.resident_id = :residentId', {
        residentId: filters.resident_id,
      });
    }
    if (filters.maintenance_due_id) {
      query.andWhere('payment.maintenance_due_id = :maintenanceDueId', {
        maintenanceDueId: filters.maintenance_due_id,
      });
    }
    if (from) {
      query.andWhere('payment.payment_date >= :from', { from });
    }
    if (to) {
      query.andWhere('payment.payment_date <= :to', { to });
    }

    return query;
  }

  // ------------------------------------------------------------------ //
  // GET /reports/complaints                                             //
  // ------------------------------------------------------------------ //
  /**
   * Complaint report. Only the assignee REFERENCE (user id) is exposed; no
   * user/authentication columns are joined.
   */
  async getComplaints(
    organizationId: string,
    filters: ComplaintsReportQueryDto = new ComplaintsReportQueryDto(),
  ): Promise<PaginatedReport<ComplaintReportRow>> {
    const { page, limit, skip } = this.resolvePagination(filters);
    const query = this.buildComplaintsQuery(organizationId, filters);

    query.orderBy('complaint.created_at', 'DESC').skip(skip).take(limit);

    const [rows, total] = await query.getManyAndCount();

    const items: ComplaintReportRow[] = rows.map((complaint) => ({
      complaint_id: complaint.id,
      category: complaint.category,
      subject: complaint.subject,
      status: complaint.status,
      priority: complaint.priority,
      resident_id: complaint.resident_id,
      assigned_to: complaint.assigned_to ?? null,
      flat: {
        id: complaint.flat_id,
        flat_identifier: complaint.flat?.flat_identifier ?? null,
      },
      building: complaint.flat
        ? {
            id: complaint.flat.building_id,
            name: complaint.flat.building?.name ?? null,
          }
        : null,
      created_at: complaint.created_at ?? null,
      resolved_at: complaint.resolved_at ?? null,
      updated_at: complaint.updated_at ?? null,
    }));

    return this.toPage(items, total, page, limit);
  }

  /** Bounded, deterministically ordered complaint rows (CSV export source). */
  async fetchComplaints(
    organizationId: string,
    filters: ComplaintsFilters = {},
    maxRows: number,
  ): Promise<BoundedRows<Complaint>> {
    const query = this.buildComplaintsQuery(organizationId, filters);
    query
      .orderBy('complaint.created_at', 'DESC')
      .addOrderBy('complaint.id', 'DESC')
      .take(maxRows + 1);

    return this.bounded(await query.getMany(), maxRows);
  }

  private buildComplaintsQuery(
    organizationId: string,
    filters: ComplaintsFilters,
  ): SelectQueryBuilder<Complaint> {
    this.assertOrganization(organizationId);
    const { from, to } = this.resolveDateRange(filters);

    const status = this.parseEnumFilter(
      filters.status,
      COMPLAINT_STATUSES,
      'status',
    );
    const priority = this.parseEnumFilter(
      filters.priority,
      COMPLAINT_PRIORITIES,
      'priority',
    );

    const query = this.dataSource
      .getRepository(Complaint)
      .createQueryBuilder('complaint')
      .leftJoinAndSelect('complaint.flat', 'flat')
      .leftJoinAndSelect('flat.building', 'building')
      .where('complaint.organization_id = :organizationId', { organizationId })
      .andWhere('(flat.id IS NULL OR flat.organization_id = :organizationId)');

    if (status) {
      query.andWhere('complaint.status = :status', { status });
    }
    if (priority) {
      query.andWhere('complaint.priority = :priority', { priority });
    }
    if (filters.category) {
      query.andWhere('complaint.category = :category', {
        category: filters.category,
      });
    }
    if (filters.assigned_to) {
      query.andWhere('complaint.assigned_to = :assignedTo', {
        assignedTo: filters.assigned_to,
      });
    }
    if (filters.flat_id) {
      query.andWhere('complaint.flat_id = :flatId', { flatId: filters.flat_id });
    }
    if (filters.building_id) {
      query.andWhere('flat.building_id = :buildingId', {
        buildingId: filters.building_id,
      });
    }
    if (from) {
      query.andWhere('complaint.created_at >= :from', { from });
    }
    if (to) {
      query.andWhere('complaint.created_at <= :to', { to });
    }

    return query;
  }

  // ------------------------------------------------------------------ //
  // GET /reports/notices                                                //
  // ------------------------------------------------------------------ //
  /**
   * Notice report. Valid statuses are exactly DRAFT / PUBLISHED / ARCHIVED.
   * EXPIRED is NOT a notice status and is rejected with 400.
   */
  async getNotices(
    organizationId: string,
    filters: NoticesReportQueryDto = new NoticesReportQueryDto(),
  ): Promise<PaginatedReport<NoticeReportRow>> {
    const { page, limit, skip } = this.resolvePagination(filters);
    const query = this.buildNoticesQuery(organizationId, filters);

    query.orderBy('notice.created_at', 'DESC').skip(skip).take(limit);

    const [rows, total] = await query.getManyAndCount();

    const items: NoticeReportRow[] = rows.map((notice) => ({
      notice_id: notice.id,
      title: notice.title,
      status: notice.status,
      published_at: notice.published_at ?? null,
      created_at: notice.created_at ?? null,
      updated_at: notice.updated_at ?? null,
    }));

    return this.toPage(items, total, page, limit);
  }

  /** Bounded, deterministically ordered notice rows (CSV export source). */
  async fetchNotices(
    organizationId: string,
    filters: NoticesFilters = {},
    maxRows: number,
  ): Promise<BoundedRows<Notice>> {
    const query = this.buildNoticesQuery(organizationId, filters);
    query
      .orderBy('notice.created_at', 'DESC')
      .addOrderBy('notice.id', 'DESC')
      .take(maxRows + 1);

    return this.bounded(await query.getMany(), maxRows);
  }

  private buildNoticesQuery(
    organizationId: string,
    filters: NoticesFilters,
  ): SelectQueryBuilder<Notice> {
    this.assertOrganization(organizationId);
    const { from, to } = this.resolveDateRange(filters);

    const status = this.parseEnumFilter(
      filters.status,
      NOTICE_STATUSES,
      'status',
    );

    const query = this.dataSource
      .getRepository(Notice)
      .createQueryBuilder('notice')
      .where('notice.organization_id = :organizationId', { organizationId });

    if (status) {
      query.andWhere('notice.status = :status', { status });
    }
    if (from) {
      query.andWhere('notice.created_at >= :from', { from });
    }
    if (to) {
      query.andWhere('notice.created_at <= :to', { to });
    }

    return query;
  }

  // ------------------------------------------------------------------ //
  // GET /reports/polls (admin-only, aggregate results)                  //
  // ------------------------------------------------------------------ //
  /**
   * Aggregate poll results only. Individual resident choices and resident ids
   * are never disclosed: votes are counted per option inside SQL.
   */
  async getPolls(
    organizationId: string,
    filters: PollsReportQueryDto = new PollsReportQueryDto(),
  ): Promise<PaginatedReport<PollReportRow>> {
    const { page, limit, skip } = this.resolvePagination(filters);
    const query = this.buildPollsQuery(organizationId, filters);

    query.orderBy('poll.created_at', 'DESC').skip(skip).take(limit);

    const [rows, total] = await query.getManyAndCount();
    const optionCountRows = await this.loadPollOptionCounts(
      organizationId,
      rows.map((poll) => poll.id),
    );

    const items: PollReportRow[] = rows.map((poll) => {
      const options = this.mapPollOptions(optionCountRows, poll.id);
      const totalVotes = options.reduce(
        (sum, option) => sum + option.vote_count,
        0,
      );
      return {
        poll_id: poll.id,
        title: poll.title,
        status: poll.status,
        starts_at: poll.starts_at ?? null,
        ends_at: poll.ends_at ?? null,
        created_at: poll.created_at ?? null,
        updated_at: poll.updated_at ?? null,
        total_votes: totalVotes,
        options: options.map((option) => ({
          ...option,
          percentage: this.percentage(option.vote_count, totalVotes),
        })),
      };
    });

    return this.toPage(items, total, page, limit);
  }

  /** Bounded polls + aggregated option counts (CSV export source). */
  async fetchPolls(
    organizationId: string,
    filters: PollsFilters = {},
    maxRows: number,
  ): Promise<BoundedPollRows> {
    const query = this.buildPollsQuery(organizationId, filters);
    query
      .orderBy('poll.created_at', 'DESC')
      .addOrderBy('poll.id', 'DESC')
      .take(maxRows + 1);

    const fetched = await query.getMany();
    const polls = fetched.slice(0, maxRows);
    const optionRows = await this.loadPollOptionCounts(
      organizationId,
      polls.map((poll) => poll.id),
    );

    return { polls, optionRows, truncated: fetched.length > maxRows };
  }

  private buildPollsQuery(
    organizationId: string,
    filters: PollsFilters,
  ): SelectQueryBuilder<Poll> {
    this.assertOrganization(organizationId);
    const { from, to } = this.resolveDateRange(filters);

    const status = this.parseEnumFilter(
      filters.status,
      POLL_STATUSES,
      'status',
    );

    const query = this.dataSource
      .getRepository(Poll)
      .createQueryBuilder('poll')
      .where('poll.organization_id = :organizationId', { organizationId });

    if (status) {
      query.andWhere('poll.status = :status', { status });
    }
    if (from) {
      query.andWhere('poll.created_at >= :from', { from });
    }
    if (to) {
      query.andWhere('poll.created_at <= :to', { to });
    }

    return query;
  }

  /** Aggregated option vote counts per poll (organization scoped, no votes). */
  private async loadPollOptionCounts(
    organizationId: string,
    pollIds: string[],
  ): Promise<PollOptionCountRow[]> {
    if (pollIds.length === 0) {
      return [];
    }

    return this.dataSource
      .getRepository(PollOption)
      .createQueryBuilder('option')
      .select('option.id', 'option_id')
      .addSelect('option.poll_id', 'poll_id')
      .addSelect('option.option_text', 'option_text')
      .addSelect('option.display_order', 'display_order')
      .addSelect('COUNT(vote.id)', 'vote_count')
      .leftJoin(
        PollVote,
        'vote',
        'vote.option_id = option.id AND vote.organization_id = :organizationId',
      )
      .where('option.organization_id = :organizationId', { organizationId })
      .andWhere('option.poll_id IN (:...pollIds)', { pollIds })
      .groupBy('option.id')
      .orderBy('option.display_order', 'ASC')
      .getRawMany<PollOptionCountRow>();
  }

  private mapPollOptions(
    optionCountRows: PollOptionCountRow[],
    pollId: string,
  ): {
    option_id: string;
    option_text: string;
    display_order: number;
    vote_count: number;
  }[] {
    return (optionCountRows ?? [])
      .filter((row) => row.poll_id === pollId)
      .map((row) => ({
        option_id: row.option_id,
        option_text: row.option_text,
        display_order: Number(row.display_order) || 0,
        vote_count: Number(row.vote_count) || 0,
      }));
  }

  // ------------------------------------------------------------------ //
  // Shared helpers                                                      //
  // ------------------------------------------------------------------ //
  private assertOrganization(organizationId: string | null | undefined): void {
    if (!organizationId) {
      // SUPER_ADMIN without a valid X-Organization-Id, or a user without
      // an organization membership.
      throw new ForbiddenException('Organization context is required');
    }
  }

  private parseEnumFilter<T extends string>(
    value: string | undefined,
    allowed: readonly T[],
    field: string,
  ): T | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (!(allowed as readonly string[]).includes(value)) {
      throw new BadRequestException(`Invalid ${field} filter`);
    }
    return value as T;
  }

  private parseBooleanFilter(
    value: string | undefined,
    field: string,
  ): boolean | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (value === 'true') {
      return true;
    }
    if (value === 'false') {
      return false;
    }
    throw new BadRequestException(`Invalid ${field} filter`);
  }

  private parseDateFilter(
    value: string | undefined,
    field: string,
  ): Date | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (!ISO_DATE_PATTERN.test(value)) {
      throw new BadRequestException(`Invalid ${field} filter`);
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`Invalid ${field} filter`);
    }
    return parsed;
  }

  /** from/to are ISO dates or timestamps; from > to is a 400. */
  private resolveDateRange(filters: {
    from?: string;
    to?: string;
  }): { from?: Date; to?: Date } {
    const from = this.parseDateFilter(filters?.from, 'from');
    const to = this.parseDateFilter(filters?.to, 'to');
    if (from && to && from.getTime() > to.getTime()) {
      throw new BadRequestException(
        'Invalid date range: from must not be after to',
      );
    }
    return { from, to };
  }

  /** Defensive bound in addition to DTO validation (which rejects). */
  private resolvePagination(filters?: {
    page?: number;
    limit?: number;
  }): { page: number; limit: number; skip: number } {
    const page = this.parsePositiveInt(filters?.page, 1);
    const limit = this.parsePositiveInt(
      filters?.limit,
      REPORT_DEFAULT_PAGE_SIZE,
      REPORT_MAX_PAGE_SIZE,
    );
    return { page, limit, skip: (page - 1) * limit };
  }

  private parsePositiveInt(
    value: number | string | undefined,
    fallback: number,
    max: number = Number.MAX_SAFE_INTEGER,
  ): number {
    if (value === undefined || value === null || value === '') {
      return fallback;
    }
    const parsed = Number.parseInt(String(value), 10);
    if (Number.isNaN(parsed)) {
      return fallback;
    }
    return Math.min(Math.max(parsed, 1), max);
  }

  /**
   * Fetch-one-extra strategy: keeps memory bounded while detecting truncation.
   * `truncated` is true only when MORE than maxRows rows matched.
   */
  private bounded<T>(rows: T[], maxRows: number): BoundedRows<T> {
    const list = rows ?? [];
    if (list.length > maxRows) {
      return { rows: list.slice(0, maxRows), truncated: true };
    }
    return { rows: list, truncated: false };
  }

  private percentage(part: number, total: number): number {
    if (!total || total <= 0) {
      return 0;
    }
    return Math.round((part / total) * 1000) / 10;
  }

  private toPage<T>(
    items: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedReport<T> {
    return {
      items,
      total,
      page,
      limit,
      totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
    };
  }
}
