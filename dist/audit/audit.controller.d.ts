import { AuditService } from './audit.service';
export declare class AuditController {
    private readonly auditService;
    constructor(auditService: AuditService);
    findAll(req: any, query: Record<string, unknown>): Promise<import("./audit.dto").AuditLogPage>;
    findOne(req: any, id: string): Promise<import("./audit.entity").AuditLog>;
    private resolveOrganizationId;
}
