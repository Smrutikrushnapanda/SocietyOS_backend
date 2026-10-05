import { Organization } from './organization.entity';
import { User } from './user.entity';
import { Resident } from './resident.entity';
import { Flat } from './flat.entity';
export declare class Complaint {
    id: string;
    organization_id: string;
    resident_id: string;
    flat_id: string;
    category: string;
    subject: string;
    description: string;
    status: string;
    priority: string;
    assigned_to: string | null;
    resolved_at: Date | null;
    created_at: Date;
    updated_at: Date;
    organization: Organization;
    resident: Resident;
    flat: Flat;
    assignedToUser: User;
}
