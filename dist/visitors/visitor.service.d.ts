import { DataSource } from 'typeorm';
import { Visitor } from '../database/entities/visitor.entity';
import { OrganizationContextService } from '../organization/organization-context.service';
import { AuditService } from '../audit/audit.service';
export declare class VisitorService {
    private readonly dataSource;
    private readonly organizationContextService;
    private readonly auditService;
    constructor(dataSource: DataSource, organizationContextService: OrganizationContextService, auditService: AuditService);
    private buildAuditOptions;
    private emitAudit;
    createVisitor(createVisitorDto: {
        organization_id: string;
        name: string;
        mobile: string;
        active?: boolean;
    }): Promise<Visitor>;
    findAll(): Promise<Visitor[]>;
    findOne(id: string): Promise<Visitor>;
    update(id: string, updateVisitorDto: {
        name?: string;
        mobile?: string;
        active?: boolean;
    }): Promise<Visitor>;
    remove(id: string): Promise<Visitor>;
}
