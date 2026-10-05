import { DataSource } from 'typeorm';
import { Resident } from '../database/entities/resident.entity';
import { OrganizationContextService } from '../organization/organization-context.service';
import { AuditService } from '../audit/audit.service';
export declare class ResidentService {
    private readonly dataSource;
    private readonly organizationContextService;
    private readonly auditService;
    constructor(dataSource: DataSource, organizationContextService: OrganizationContextService, auditService: AuditService);
    private buildAuditOptions;
    private emitAudit;
    createResident(createResidentDto: {
        user_id: string;
        organization_id: string;
        flat_id?: string;
    }): Promise<Resident>;
    findAll(): Promise<Resident[]>;
    findOne(id: string): Promise<Resident>;
    update(id: string, updateResidentDto: {
        flat_id?: string;
        kyc_status?: 'PENDING' | 'VERIFIED' | 'REJECTED';
        app_access_status?: boolean;
    }): Promise<Resident>;
    assignFlat(residentId: string, flatId: string): Promise<Resident>;
    assignAppAccess(residentId: string, appAccessStatus: boolean): Promise<Resident>;
}
