import { ResidentService } from './resident.service';
import { Resident } from '../database/entities/resident.entity';
export declare class ResidentController {
    private readonly residentService;
    constructor(residentService: ResidentService);
    createResident(createResidentDto: {
        user_id: string;
        organization_id: string;
        flat_id?: string;
    }): Promise<Resident>;
    findAll(): Promise<Resident[]>;
    findOne(id: string): Promise<Resident>;
    update(id: string, updateResidentDto: {
        flat_id?: string;
        kyc_status?: 'PENDING' | 'VERIFIED' | 'REJECTED';
    }): Promise<Resident>;
    assignFlat(residentId: string, body: {
        flat_id: string;
    }): Promise<Resident>;
}
