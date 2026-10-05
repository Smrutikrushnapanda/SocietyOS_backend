import { FloorService } from './floor.service';
import { Floor } from '../database/entities/floor.entity';
export declare class FloorController {
    private readonly floorService;
    constructor(floorService: FloorService);
    create(createFloorDto: {
        organization_id: string;
        building_id: string;
        floor_number: number;
        name?: string;
    }): Promise<Floor>;
    findAll(): Promise<Floor[]>;
    findOne(id: string): Promise<Floor>;
    update(id: string, updateFloorDto: {
        floor_number?: number;
        name?: string;
        isActive?: boolean;
    }): Promise<Floor>;
    remove(id: string): Promise<Floor>;
    findByBuilding(buildingId: string): Promise<Floor[]>;
}
