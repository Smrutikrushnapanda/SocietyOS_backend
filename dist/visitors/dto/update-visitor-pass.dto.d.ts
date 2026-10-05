import { PassStatus } from '../enum/pass-status.enum';
export declare class UpdateVisitorPassDto {
    pass_status?: PassStatus;
    validity_start?: Date;
    validity_end?: Date;
    organization_id?: string;
}
