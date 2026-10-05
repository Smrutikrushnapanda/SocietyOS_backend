import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsDate,
} from 'class-validator';
import { VisitorStatus } from '../enum/visitor-status.enum';

export class CreateVisitorVisitDto {
  @IsString()
  @IsNotEmpty()
  visitor_id: string;

  @IsEnum(VisitorStatus)
  @IsNotEmpty()
  visit_status: VisitorStatus;

  @IsString()
  @IsOptional()
  visit_purpose?: string;

  @IsDate()
  @IsOptional()
  expected_entry_time?: Date;

  @IsString()
  @IsNotEmpty()
  organization_id: string;
}
