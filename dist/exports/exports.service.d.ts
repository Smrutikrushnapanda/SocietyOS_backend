import { ReportsService } from '../reports/reports.service';
import { ComplaintsExportQueryDto, MaintenanceDuesExportQueryDto, NoticesExportQueryDto, PaymentsExportQueryDto, PollsExportQueryDto, ResidentsExportQueryDto, VisitorsExportQueryDto } from './exports.dto';
import { CsvExportResult } from './exports.types';
export declare class ExportsService {
    private readonly reportsService;
    constructor(reportsService: ReportsService);
    exportResidents(organizationId: string, filters?: ResidentsExportQueryDto): Promise<CsvExportResult>;
    exportVisitors(organizationId: string, filters?: VisitorsExportQueryDto): Promise<CsvExportResult>;
    exportMaintenanceDues(organizationId: string, filters?: MaintenanceDuesExportQueryDto): Promise<CsvExportResult>;
    exportPayments(organizationId: string, filters?: PaymentsExportQueryDto): Promise<CsvExportResult>;
    exportComplaints(organizationId: string, filters?: ComplaintsExportQueryDto): Promise<CsvExportResult>;
    exportNotices(organizationId: string, filters?: NoticesExportQueryDto): Promise<CsvExportResult>;
    exportPolls(organizationId: string, filters?: PollsExportQueryDto): Promise<CsvExportResult>;
    private assertOrganization;
    private toResult;
    private percentage;
}
