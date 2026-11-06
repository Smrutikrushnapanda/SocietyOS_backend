import { IsNotEmpty, IsString, IsOptional, IsUUID, IsNumber, Min, IsIn } from 'class-validator';

export class CreateAmcContractDto {
  @IsUUID()
  @IsNotEmpty()
  vendor_id: string;

  @IsString()
  @IsNotEmpty()
  contract_name: string;

  @IsString()
  @IsOptional()
  contract_type?: string;

  @IsString()
  @IsNotEmpty()
  start_date: string;

  @IsString()
  @IsNotEmpty()
  end_date: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  amount?: number;

  @IsString()
  @IsOptional()
  @IsIn(['Active', 'Expired', 'Pending Renewal'])
  status?: string;

  @IsString()
  @IsOptional()
  service_coverage?: string;

  @IsString()
  @IsOptional()
  renewal_notes?: string;
}

export class UpdateAmcContractDto {
  @IsUUID()
  @IsOptional()
  vendor_id?: string;

  @IsString()
  @IsOptional()
  contract_name?: string;

  @IsString()
  @IsOptional()
  contract_type?: string;

  @IsString()
  @IsOptional()
  start_date?: string;

  @IsString()
  @IsOptional()
  end_date?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  amount?: number;

  @IsString()
  @IsOptional()
  @IsIn(['Active', 'Expired', 'Pending Renewal'])
  status?: string;

  @IsString()
  @IsOptional()
  service_coverage?: string;

  @IsString()
  @IsOptional()
  renewal_notes?: string;
}
