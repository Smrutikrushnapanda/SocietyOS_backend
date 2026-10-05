import { DataSource } from 'typeorm';
import { MaintenanceConfiguration } from '../database/entities/maintenance-configuration.entity';
import { OrganizationContextService } from '../organization/organization-context.service';
import { AuditService } from '../audit/audit.service';
export declare class MaintenanceConfigurationService {
    private readonly dataSource;
    private readonly organizationContextService;
    private readonly auditService;
    constructor(dataSource: DataSource, organizationContextService: OrganizationContextService, auditService: AuditService);
    private buildAuditOptions;
    private emitAudit;
    findOneByOrganization(organizationId: string): Promise<MaintenanceConfiguration | null>;
    findAllByOrganization(organizationId: string): Promise<MaintenanceConfiguration[]>;
    create(createDto: {
        organization_id: string;
        base_maintenance_amount: number;
        due_day_of_month: number;
        late_charge_type: 'FIXED' | 'PERCENTAGE';
        late_charge_value: number;
        late_charge_grace_days: number;
    }): Promise<MaintenanceConfiguration[]>;
    update(id: string, updateDto: {
        base_maintenance_amount?: number;
        due_day_of_month?: number;
        late_charge_type?: 'FIXED' | 'PERCENTAGE';
        late_charge_value?: number;
        late_charge_grace_days?: number;
        is_active?: boolean;
    }): Promise<MaintenanceConfiguration>;
}
