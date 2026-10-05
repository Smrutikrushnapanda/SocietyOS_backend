import { VisitorStatus } from '../enum/visitor-status.enum';
export declare class CreateVisitorVisitDto {
    visitor_id: string;
    visit_status: VisitorStatus;
    visit_purpose?: string;
    expected_entry_time?: Date;
    organization_id: string;
}
