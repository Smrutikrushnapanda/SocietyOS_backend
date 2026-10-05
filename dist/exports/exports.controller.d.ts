import type { Response } from 'express';
import { ExportsService } from './exports.service';
import { ComplaintsExportQueryDto, MaintenanceDuesExportQueryDto, NoticesExportQueryDto, PaymentsExportQueryDto, PollsExportQueryDto, ResidentsExportQueryDto, VisitorsExportQueryDto } from './exports.dto';
export declare class ExportsController {
    private readonly exportsService;
    constructor(exportsService: ExportsService);
    exportResidents(req: any, query: ResidentsExportQueryDto, res: Response): Promise<void>;
    exportVisitors(req: any, query: VisitorsExportQueryDto, res: Response): Promise<void>;
    exportMaintenanceDues(req: any, query: MaintenanceDuesExportQueryDto, res: Response): Promise<void>;
    exportPayments(req: any, query: PaymentsExportQueryDto, res: Response): Promise<void>;
    exportComplaints(req: any, query: ComplaintsExportQueryDto, res: Response): Promise<void>;
    exportNotices(req: any, query: NoticesExportQueryDto, res: Response): Promise<void>;
    exportPolls(req: any, query: PollsExportQueryDto, res: Response): Promise<void>;
    private send;
    private resolveOrganizationId;
}
