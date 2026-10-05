import { PassStatus } from '../enum/pass-status.enum';
export declare class CreateVisitorPassDto {
    visitor_id: string;
    visitor_visit_id?: string;
    issuer?: string;
    pass_status: PassStatus;
    validity_start: Date;
    validity_end: Date;
    organization_id: string;
}
