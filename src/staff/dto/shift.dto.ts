import { IsNotEmpty, IsString, IsOptional, IsInt, Min, IsIn } from 'class-validator';

export class CreateShiftDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  start_time: string;

  @IsString()
  @IsNotEmpty()
  end_time: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  required_guards?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  assigned_guards?: number;

  @IsString()
  @IsOptional()
  assigned_gates?: string;

  @IsString()
  @IsOptional()
  @IsIn(['Active', 'Inactive'])
  status?: string;
}

export class UpdateShiftDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  start_time?: string;

  @IsString()
  @IsOptional()
  end_time?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  required_guards?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  assigned_guards?: number;

  @IsString()
  @IsOptional()
  assigned_gates?: string;

  @IsString()
  @IsOptional()
  @IsIn(['Active', 'Inactive'])
  status?: string;
}
