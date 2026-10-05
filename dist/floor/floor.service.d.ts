import { DataSource } from 'typeorm';
import { Floor } from '../database/entities/floor.entity';
import { OrganizationContextService } from '../organization/organization-context.service';
import { AuditService } from '../audit/audit.service';
export declare class FloorService {
    private readonly dataSource;
    private readonly organizationContextService;
    private readonly auditService;
    constructor(dataSource: DataSource, organizationContextService: OrganizationContextService, auditService: AuditService);
    private buildAuditOptions;
    private emitAudit;
    create(createFloorDto: {
        organization_id: string;
        building_id: string;
        floor_number: number;
        name?: string;
    }): Promise<Floor>;
    findAll(): Promise<Floor[]>;
    findAllByBuilding(buildingId: string): Promise<Floor[]>;
    findOne(id: string): Promise<Floor>;
    update(id: string, updateFloorDto: {
        floor_number?: number;
        name?: string;
        isActive?: boolean;
    }): Promise<Floor>;
    remove(id: string): Promise<Floor>;
}
