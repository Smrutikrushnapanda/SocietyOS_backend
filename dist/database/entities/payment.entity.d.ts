import { MaintenanceDue } from './maintenance-due.entity';
import { User } from './user.entity';
import { Resident } from './resident.entity';
import { Flat } from './flat.entity';
import { Organization } from './organization.entity';
export declare class Payment {
    id: string;
    organization_id: string;
    resident_id: string | null;
    flat_id: string | null;
    maintenance_due_id: string;
    amount: number;
    payment_method: 'CASH' | 'UPI' | 'NET_BANKING' | 'CHEQUE' | 'CARD';
    payment_status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
    payment_date: Date;
    transaction_id: string | null;
    created_by: string;
    created_at: Date;
    updated_at: Date;
    maintenance_due: MaintenanceDue;
    createdByUser: User;
    resident: Resident | null;
    flat: Flat | null;
    organization: Organization;
}
