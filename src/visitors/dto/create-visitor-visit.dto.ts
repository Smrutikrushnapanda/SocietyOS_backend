import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsDateString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { VisitorStatus } from '../enum/visitor-status.enum';

export class CreateVisitorVisitDto {
  @IsUUID()
  @IsNotEmpty()
  visitor_id: string;

  @IsEnum(VisitorStatus)
  @IsNotEmpty()
  visit_status: VisitorStatus;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  visit_purpose?: string;

  @IsDateString()
  @IsOptional()
  expected_entry_time?: string | Date;

  @IsUUID()
  @IsOptional()
  host_resident_id?: string;
}
