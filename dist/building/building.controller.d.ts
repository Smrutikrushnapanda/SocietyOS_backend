import { BuildingService } from './building.service';
import { Building } from '../database/entities/building.entity';
export declare class BuildingController {
    private readonly buildingService;
    constructor(buildingService: BuildingService);
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
