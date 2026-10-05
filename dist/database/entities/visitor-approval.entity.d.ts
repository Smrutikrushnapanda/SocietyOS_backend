import { VisitorVisit } from './visitor-visit.entity';
export declare class VisitorApproval {
    id: string;
    organization_id: string;
    visitor_visit_id: string;
    approver_id: string | null;
    approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
    approved_at: Date | null;
    rejected_at: Date | null;
    createdAt: Date;
    updatedAt: Date;
    visitor_visit: VisitorVisit;
}
