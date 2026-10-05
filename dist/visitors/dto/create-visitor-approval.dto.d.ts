import { ApprovalStatus } from '../enum/approval-status.enum';
export declare class CreateVisitorApprovalDto {
    visitor_visit_id: string;
    approval_status: ApprovalStatus;
    approver_id?: string;
    approved_at?: string;
    rejected_at?: string;
    organization_id: string;
}
