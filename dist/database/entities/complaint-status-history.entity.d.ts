import { Complaint } from './complaint.entity';
import { User } from './user.entity';
export declare class ComplaintStatusHistory {
    id: string;
    complaint_id: string;
    previous_status: string;
    new_status: string;
    changed_by: string;
    changed_at: Date;
    reason: string | null;
    complaint: Complaint;
    changedByUser: User;
}
