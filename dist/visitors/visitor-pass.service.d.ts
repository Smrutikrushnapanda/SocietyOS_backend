import { DataSource } from 'typeorm';
import { VisitorPass } from '../database/entities/visitor-pass.entity';
import { OrganizationContextService } from '../organization/organization-context.service';
import { AuditService } from '../audit/audit.service';
export declare class VisitorPassService {
    private readonly dataSource;
    private readonly organizationContextService;
    private readonly auditService;
    constructor(dataSource: DataSource, organizationContextService: OrganizationContextService, auditService: AuditService);
    private buildAuditOptions;
    private emitAudit;
    createVisitorPass(createVisitorPassDto: {
        organization_id: string;
        visitor_id: string;
        visitor_visit_id?: string;
        issuer?: string;
        pass_status: string;
        validity_start: Date;
        validity_end: Date;
    }): Promise<VisitorPass>;
    findAll(): Promise<VisitorPass[]>;
    findOne(id: string): Promise<VisitorPass>;
    update(id: string, updateVisitorPassDto: {
        pass_status?: string;
        validity_start?: Date;
        validity_end?: Date;
        organization_id?: string;
    }): Promise<VisitorPass>;
    remove(id: string): Promise<VisitorPass>;
}
