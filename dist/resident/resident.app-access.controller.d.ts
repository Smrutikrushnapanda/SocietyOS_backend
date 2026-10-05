import { ResidentService } from './resident.service';
import { Resident } from '../database/entities/resident.entity';
export declare class ResidentAppAccessController {
    private readonly residentService;
    constructor(residentService: ResidentService);
    updateAppAccess(residentId: string, body: {
        app_access_status: boolean;
    }): Promise<Resident>;
}
