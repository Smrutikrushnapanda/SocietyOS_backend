import { DataSource } from 'typeorm';
import { VisitorApproval } from '../database/entities/visitor-approval.entity';
import { OrganizationContextService } from '../organization/organization-context.service';
import { AuditService } from '../audit/audit.service';
export declare class VisitorApprovalService {
    private readonly dataSource;
    private readonly organizationContextService;
    private readonly auditService;
    constructor(dataSource: DataSource, organizationContextService: OrganizationContextService, auditService: AuditService);
    private buildAuditOptions;
    private emitAudit;
    createVisitorApproval(createVisitorApprovalDto: {
        organization_id: string;
        visitor_visit_id: string;
        approval_status: string;
        approver_id?: string;
        approved_at?: string;
        rejected_at?: string;
    }): Promise<VisitorApproval>;
    findAll(): Promise<VisitorApproval[]>;
    findOne(id: string): Promise<VisitorApproval>;
    update(id: string, updateVisitorApprovalDto: {
        approval_status?: string;
        approved_at?: string;
        rejected_at?: string;
        organization_id?: string;
    }): Promise<VisitorApproval>;
    remove(id: string): Promise<VisitorApproval>;
}
