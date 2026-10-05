export class CreateMaintenanceConfigurationDto {
  organization_id: string;
  base_maintenance_amount: number;
  due_day_of_month: number;
  late_charge_type: 'FIXED' | 'PERCENTAGE';
  late_charge_value: number;
  late_charge_grace_days: number;
}

export class UpdateMaintenanceConfigurationDto {
  base_maintenance_amount?: number;
  due_day_of_month?: number;
  late_charge_type?: 'FIXED' | 'PERCENTAGE';
  late_charge_value?: number;
  late_charge_grace_days?: number;
  is_active?: boolean;
}

export class GenerateDueDto {
  flat_id: string;
  billing_period_start: Date;
  billing_period_end: Date;
}

export class WaiveLateChargeDto {
  due_id: string;
  reason?: string;
}

export class CreatePaymentDto {
  organization_id: string;
  resident_id?: string;
  flat_id?: string;
  maintenance_due_id: string;
  amount: number;
  payment_method: 'CASH' | 'UPI' | 'NET_BANKING' | 'CHEQUE' | 'CARD';
}
