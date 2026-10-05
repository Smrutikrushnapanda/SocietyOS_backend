import { DataSource } from 'typeorm';
import { Building } from '../database/entities/building.entity';
import { OrganizationContextService } from '../organization/organization-context.service';
import { AuditService } from '../audit/audit.service';
export declare class BuildingService {
    private readonly dataSource;
    private readonly organizationContextService;
    private readonly auditService;
    constructor(dataSource: DataSource, organizationContextService: OrganizationContextService, auditService: AuditService);
    create(createBuildingDto: {
        organization_id: string;
        name: string;
        code?: string;
        totalFloors?: number;
    }): Promise<Building>;
    findAll(): Promise<Building[]>;
    findOne(id: string): Promise<Building>;
    update(id: string, updateBuildingDto: {
        name?: string;
        code?: string;
        totalFloors?: number;
        isActive?: boolean;
    }): Promise<Building>;
    remove(id: string): Promise<Building>;
}
