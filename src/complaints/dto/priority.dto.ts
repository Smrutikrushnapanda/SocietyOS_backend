import { IsNotEmpty, IsString, IsOptional, IsInt, Min, IsIn } from 'class-validator';

export class CreatePriorityConfigDto {
  @IsString()
  @IsNotEmpty()
  priority: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  order_severity?: number;

  @IsInt()
  @Min(1)
  response_deadline_minutes: number;

  @IsInt()
  @Min(1)
  resolution_deadline_minutes: number;

  @IsInt()
  @Min(1)
  escalation_window_minutes: number;

  @IsString()
  @IsOptional()
  escalation_recipient?: string;

  @IsString()
  @IsOptional()
  @IsIn(['Active', 'Inactive'])
  status?: string;
}

export class UpdatePriorityConfigDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  order_severity?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  response_deadline_minutes?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  resolution_deadline_minutes?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  escalation_window_minutes?: number;

  @IsString()
  @IsOptional()
  escalation_recipient?: string;

  @IsString()
  @IsOptional()
  @IsIn(['Active', 'Inactive'])
  status?: string;
}
