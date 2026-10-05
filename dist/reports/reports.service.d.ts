import { DataSource } from 'typeorm';
import { Resident } from '../database/entities/resident.entity';
import { VisitorVisit } from '../database/entities/visitor-visit.entity';
import { VisitorApproval } from '../database/entities/visitor-approval.entity';
import { VisitorPass } from '../database/entities/visitor-pass.entity';
import { MaintenanceDue } from '../database/entities/maintenance-due.entity';
import { Payment } from '../database/entities/payment.entity';
import { Complaint } from '../database/entities/complaint.entity';
import { Notice } from '../database/entities/notice.entity';
import { Poll } from '../database/entities/poll.entity';
import { ComplaintsReportQueryDto, MaintenanceDuesReportQueryDto, NoticesReportQueryDto, PaymentsReportQueryDto, PollsReportQueryDto, ResidentsReportQueryDto, VisitorsReportQueryDto } from './reports.dto';
import { BoundedRows, ComplaintReportRow, ComplaintsFilters, MaintenanceDueReportRow, MaintenanceDuesFilters, NoticeReportRow, NoticesFilters, OccupancyReport, PaginatedReport, PaymentReportRow, PaymentsFilters, PollReportRow, PollsFilters, ResidentReportRow, ResidentsFilters, VisitorReportRow, VisitorsFilters } from './reports.types';
export interface PollOptionCountRow {
    option_id: string;
    poll_id: string;
    option_text: string;
    display_order: string | number;
    vote_count: string;
}
export interface BoundedVisitorRows {
    visits: VisitorVisit[];
    approvals: Map<string, VisitorApproval>;
    passes: Map<string, VisitorPass>;
    truncated: boolean;
}
export interface BoundedPollRows {
    polls: Poll[];
    optionRows: PollOptionCountRow[];
    truncated: boolean;
}
export declare class ReportsService {
    private readonly dataSource;
    constructor(dataSource: DataSource);
    getOccupancy(organizationId: string): Promise<OccupancyReport>;
    getResidents(organizationId: string, filters?: ResidentsReportQueryDto): Promise<PaginatedReport<ResidentReportRow>>;
    fetchResidents(organizationId: string, filters: ResidentsFilters | undefined, maxRows: number): Promise<BoundedRows<Resident>>;
    private buildResidentsQuery;
    getVisitors(organizationId: string, filters?: VisitorsReportQueryDto): Promise<PaginatedReport<VisitorReportRow>>;
    fetchVisitors(organizationId: string, filters: VisitorsFilters | undefined, maxRows: number): Promise<BoundedVisitorRows>;
    private buildVisitorsQuery;
    private loadVisitContext;
    getMaintenanceDues(organizationId: string, filters?: MaintenanceDuesReportQueryDto): Promise<PaginatedReport<MaintenanceDueReportRow>>;
    fetchMaintenanceDues(organizationId: string, filters: MaintenanceDuesFilters | undefined, maxRows: number): Promise<BoundedRows<MaintenanceDue>>;
    private buildMaintenanceDuesQuery;
    getPayments(organizationId: string, filters?: PaymentsReportQueryDto): Promise<PaginatedReport<PaymentReportRow>>;
    fetchPayments(organizationId: string, filters: PaymentsFilters | undefined, maxRows: number): Promise<BoundedRows<Payment>>;
    private buildPaymentsQuery;
    getComplaints(organizationId: string, filters?: ComplaintsReportQueryDto): Promise<PaginatedReport<ComplaintReportRow>>;
    fetchComplaints(organizationId: string, filters: ComplaintsFilters | undefined, maxRows: number): Promise<BoundedRows<Complaint>>;
    private buildComplaintsQuery;
    getNotices(organizationId: string, filters?: NoticesReportQueryDto): Promise<PaginatedReport<NoticeReportRow>>;
    fetchNotices(organizationId: string, filters: NoticesFilters | undefined, maxRows: number): Promise<BoundedRows<Notice>>;
    private buildNoticesQuery;
    getPolls(organizationId: string, filters?: PollsReportQueryDto): Promise<PaginatedReport<PollReportRow>>;
    fetchPolls(organizationId: string, filters: PollsFilters | undefined, maxRows: number): Promise<BoundedPollRows>;
    private buildPollsQuery;
    private loadPollOptionCounts;
    private mapPollOptions;
    private assertOrganization;
    private parseEnumFilter;
    private parseBooleanFilter;
    private parseDateFilter;
    private resolveDateRange;
    private resolvePagination;
    private parsePositiveInt;
    private bounded;
    private percentage;
    private toPage;
}
