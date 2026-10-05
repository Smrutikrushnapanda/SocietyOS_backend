import { Building } from './building.entity';
import { Floor } from './floor.entity';
import { Organization } from './organization.entity';
export declare class Flat {
    id: string;
    organization_id: string;
    building_id: string;
    floor_id: string;
    flat_identifier: string;
    flat_type: string;
    maintenance_multiplier: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    building: Building;
    floor: Floor;
    organization: Organization;
}
