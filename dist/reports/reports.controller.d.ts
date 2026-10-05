import { ReportsService } from './reports.service';
import { ComplaintsReportQueryDto, MaintenanceDuesReportQueryDto, NoticesReportQueryDto, PaymentsReportQueryDto, PollsReportQueryDto, ResidentsReportQueryDto, VisitorsReportQueryDto } from './reports.dto';
export declare class ReportsController {
    private readonly reportsService;
    constructor(reportsService: ReportsService);
    getOccupancy(req: any): Promise<import("./reports.types").OccupancyReport>;
    getResidents(req: any, query: ResidentsReportQueryDto): Promise<import("./reports.types").PaginatedReport<import("./reports.types").ResidentReportRow>>;
    getVisitors(req: any, query: VisitorsReportQueryDto): Promise<import("./reports.types").PaginatedReport<import("./reports.types").VisitorReportRow>>;
    getMaintenanceDues(req: any, query: MaintenanceDuesReportQueryDto): Promise<import("./reports.types").PaginatedReport<import("./reports.types").MaintenanceDueReportRow>>;
    getPayments(req: any, query: PaymentsReportQueryDto): Promise<import("./reports.types").PaginatedReport<import("./reports.types").PaymentReportRow>>;
    getComplaints(req: any, query: ComplaintsReportQueryDto): Promise<import("./reports.types").PaginatedReport<import("./reports.types").ComplaintReportRow>>;
    getNotices(req: any, query: NoticesReportQueryDto): Promise<import("./reports.types").PaginatedReport<import("./reports.types").NoticeReportRow>>;
    getPolls(req: any, query: PollsReportQueryDto): Promise<import("./reports.types").PaginatedReport<import("./reports.types").PollReportRow>>;
    private resolveOrganizationId;
}
