import { DataSource } from 'typeorm';
import { VisitorVisit } from '../database/entities/visitor-visit.entity';
import { OrganizationContextService } from '../organization/organization-context.service';
import { AuditService } from '../audit/audit.service';
export declare class VisitorVisitService {
    private readonly dataSource;
    private readonly organizationContextService;
    private readonly auditService;
    constructor(dataSource: DataSource, organizationContextService: OrganizationContextService, auditService: AuditService);
    private buildAuditOptions;
    private emitAudit;
    createVisitorVisit(createVisitorVisitDto: {
        organization_id: string;
        visitor_id: string;
        visit_status: string;
        visit_purpose?: string;
        expected_entry_time?: Date;
    }): Promise<VisitorVisit>;
    findAll(): Promise<VisitorVisit[]>;
    findOne(id: string): Promise<VisitorVisit>;
    update(id: string, updateVisitorVisitDto: {
        visit_status?: string;
        visit_purpose?: string;
        expected_entry_time?: Date;
        organization_id?: string;
    }): Promise<VisitorVisit>;
    remove(id: string): Promise<VisitorVisit>;
}
