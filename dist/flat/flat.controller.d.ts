import { FlatService } from './flat.service';
import { Flat } from '../database/entities/flat.entity';
export declare class FlatController {
    private readonly flatService;
    constructor(flatService: FlatService);
    create(createFlatDto: {
        organization_id: string;
        building_id: string;
        floor_id: string;
        flat_identifier: string;
        flat_type?: string;
        maintenance_multiplier?: number;
    }): Promise<Flat>;
    findAll(): Promise<Flat[]>;
    findOne(id: string): Promise<Flat>;
    update(id: string, updateFlatDto: {
        flat_identifier?: string;
        flat_type?: string;
        maintenance_multiplier?: number;
        isActive?: boolean;
    }): Promise<Flat>;
    remove(id: string): Promise<Flat>;
    findByBuilding(buildingId: string): Promise<Flat[]>;
}
