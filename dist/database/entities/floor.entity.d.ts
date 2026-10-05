import { Building } from './building.entity';
import { Flat } from './flat.entity';
export declare class Floor {
    id: string;
    organization_id: string;
    building_id: string;
    floor_number: number;
    name: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    building: Building;
    flats: Flat[];
}
