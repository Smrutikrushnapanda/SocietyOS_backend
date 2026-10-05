import { IsString, IsEnum, IsOptional, IsDate } from 'class-validator';
import { VisitorStatus } from '../enum/visitor-status.enum';

export class UpdateVisitorVisitDto {
  @IsEnum(VisitorStatus)
  @IsOptional()
  visit_status?: VisitorStatus;

  @IsString()
  @IsOptional()
  visit_purpose?: string;

  @IsDate()
  @IsOptional()
  expected_entry_time?: Date;

  @IsString()
  @IsOptional()
  organization_id?: string;
}
