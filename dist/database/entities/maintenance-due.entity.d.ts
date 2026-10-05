import { Flat } from './flat.entity';
import { Organization } from './organization.entity';
import { User } from './user.entity';
export declare class MaintenanceDue {
    id: string;
    flat_id: string;
    organization_id: string;
    base_maintenance_amount: number;
    maintenance_multiplier: number;
    calculated_amount: number;
    billing_period_start: Date;
    billing_period_end: Date;
    due_date: Date;
    late_charge: number;
    late_charge_waived: number;
    late_charge_waived_by: string | null;
    late_charge_waived_at: Date | null;
    late_charge_waiver_reason: string | null;
    status: 'PENDING' | 'OVERDUE' | 'PAID';
    payment_received_at: Date | null;
    createdAt: Date;
    updatedAt: Date;
    flat: Flat;
    organization: Organization;
    waivedByUser: User | null;
}
