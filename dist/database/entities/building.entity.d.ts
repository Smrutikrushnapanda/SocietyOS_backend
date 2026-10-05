import { Organization } from './organization.entity';
import { Floor } from './floor.entity';
export declare class Building {
    id: string;
    organization_id: string;
    name: string;
    code: string;
    totalFloors: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    organization: Organization;
    floors: Floor[];
}
