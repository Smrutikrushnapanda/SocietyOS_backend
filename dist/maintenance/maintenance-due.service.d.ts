import { DataSource } from 'typeorm';
import { MaintenanceDue } from '../database/entities/maintenance-due.entity';
import { OrganizationContextService } from '../organization/organization-context.service';
import { AuditService } from '../audit/audit.service';
export declare class MaintenanceDueService {
    private readonly dataSource;
    private readonly organizationContextService;
    private readonly auditService;
    constructor(dataSource: DataSource, organizationContextService: OrganizationContextService, auditService: AuditService);
    private buildAuditOptions;
    private emitAudit;
    generateDue(flatId: string, billingPeriodStart: Date, billingPeriodEnd: Date): Promise<MaintenanceDue>;
    private calculateDueDate;
    findOne(id: string, orgContext: any): Promise<MaintenanceDue>;
    findAllByOrganization(): Promise<MaintenanceDue[]>;
    findAllByFlat(flatId: string, orgContext: any): Promise<MaintenanceDue[]>;
    markPaid(dueId: string, orgContext: any): Promise<MaintenanceDue>;
    markOverdue(dueId: string, orgContext: any): Promise<MaintenanceDue>;
    private calculateAndApplyLateCharge;
    waiveLateCharge(dueId: string, adminUserId: string, reason?: string): Promise<MaintenanceDue>;
}
