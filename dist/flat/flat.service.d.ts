import { DataSource } from 'typeorm';
import { Flat } from '../database/entities/flat.entity';
import { OrganizationContextService } from '../organization/organization-context.service';
import { AuditService } from '../audit/audit.service';
export declare class FlatService {
    private readonly dataSource;
    private readonly organizationContextService;
    private readonly auditService;
    constructor(dataSource: DataSource, organizationContextService: OrganizationContextService, auditService: AuditService);
    private buildAuditOptions;
    private emitAudit;
    create(createFlatDto: {
        organization_id: string;
        building_id: string;
        floor_id: string;
        flat_identifier: string;
        flat_type?: string;
        maintenance_multiplier?: number;
    }): Promise<Flat>;
    findAll(): Promise<Flat[]>;
    findAllByBuilding(buildingId: string): Promise<Flat[]>;
    findOne(id: string): Promise<Flat>;
    update(id: string, updateFlatDto: {
        flat_identifier?: string;
        flat_type?: string;
        maintenance_multiplier?: number;
        isActive?: boolean;
    }): Promise<Flat>;
    remove(id: string): Promise<Flat>;
}
