import { ApprovalStatus } from '../enum/approval-status.enum';
export declare class UpdateVisitorApprovalDto {
    approval_status?: ApprovalStatus;
    approved_at?: string;
    rejected_at?: string;
    organization_id?: string;
}
