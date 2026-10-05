import { VisitorStatus } from '../enum/visitor-status.enum';
export declare class UpdateVisitorVisitDto {
    visit_status?: VisitorStatus;
    visit_purpose?: string;
    expected_entry_time?: Date;
    organization_id?: string;
}
