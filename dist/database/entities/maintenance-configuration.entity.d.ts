import { Organization } from './organization.entity';
export declare class MaintenanceConfiguration {
    id: string;
    organization_id: string;
    base_maintenance_amount: number;
    due_day_of_month: number;
    late_charge_type: 'FIXED' | 'PERCENTAGE';
    late_charge_value: number;
    late_charge_grace_days: number;
    is_active: boolean;
    createdAt: Date;
    updatedAt: Date;
    organization: Organization;
}
