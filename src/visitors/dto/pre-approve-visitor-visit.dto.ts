import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsUUID,
} from 'class-validator';

export class PreApproveVisitorVisitDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  mobile: string;

  @IsString()
  @IsOptional()
  visit_purpose?: string;

  @IsDateString()
  @IsOptional()
  expected_entry_time?: string;

  @IsUUID()
  @IsOptional()
  visitor_id?: string;
}
