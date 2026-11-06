import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateMaintenanceConfigurationDto {
  @IsNumber()
  @Min(0)
  base_maintenance_amount: number;

  @IsInt()
  @Min(1)
  @Max(31)
  due_day_of_month: number;

  @IsEnum(['FIXED', 'PERCENTAGE'])
  late_charge_type: 'FIXED' | 'PERCENTAGE';

  @IsNumber()
  @Min(0)
  late_charge_value: number;

  @IsInt()
  @Min(0)
  late_charge_grace_days: number;
  @IsOptional() @IsEnum(['ONCE', 'DAILY', 'WEEKLY'])
  late_charge_frequency?: 'ONCE' | 'DAILY' | 'WEEKLY';

  @IsOptional() @IsEnum(['FIRST_DAY', 'AFTER_PERIOD'])
  late_charge_start?: 'FIRST_DAY' | 'AFTER_PERIOD';

}

export class UpdateMaintenanceConfigurationDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  base_maintenance_amount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  due_day_of_month?: number;

  @IsOptional()
  @IsEnum(['FIXED', 'PERCENTAGE'])
  late_charge_type?: 'FIXED' | 'PERCENTAGE';

  @IsOptional()
  @IsNumber()
  @Min(0)
  late_charge_value?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  late_charge_grace_days?: number;
  @IsOptional() @IsEnum(['ONCE', 'DAILY', 'WEEKLY'])
  late_charge_frequency?: 'ONCE' | 'DAILY' | 'WEEKLY';

  @IsOptional() @IsEnum(['FIRST_DAY', 'AFTER_PERIOD'])
  late_charge_start?: 'FIRST_DAY' | 'AFTER_PERIOD';


  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class GenerateDueDto {
  @IsUUID()
  @IsNotEmpty()
  flat_id: string;

  @IsDateString()
  @IsNotEmpty()
  billing_period_start: Date;

  @IsDateString()
  @IsNotEmpty()
  billing_period_end: Date;
}

export class WaiveLateChargeDto {
  @IsOptional() @IsBoolean()
  stop_future_charges?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class CreatePaymentDto {
  @IsOptional()
  @IsUUID()
  resident_id?: string;

  @IsOptional()
  @IsUUID()
  flat_id?: string;

  @IsUUID()
  @IsNotEmpty()
  maintenance_due_id: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsEnum(['CASH', 'UPI', 'NET_BANKING', 'CHEQUE', 'CARD'])
  @IsNotEmpty()
  payment_method: 'CASH' | 'UPI' | 'NET_BANKING' | 'CHEQUE' | 'CARD';
}
