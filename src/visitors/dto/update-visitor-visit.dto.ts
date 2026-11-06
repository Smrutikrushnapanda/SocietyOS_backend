import { IsString, IsEnum, IsOptional, IsDateString, IsBoolean } from 'class-validator';
import { VisitorStatus } from '../enum/visitor-status.enum';

export class UpdateVisitorVisitDto {
  @IsEnum(VisitorStatus)
  @IsOptional()
  visit_status?: VisitorStatus;

  @IsString()
  @IsOptional()
  visit_purpose?: string;

  @IsDateString()
  @IsOptional()
  expected_entry_time?: string | Date;

  @IsBoolean()
  @IsOptional()
  check_in?: boolean;

  @IsString()
  @IsOptional()
  organization_id?: string;
}
