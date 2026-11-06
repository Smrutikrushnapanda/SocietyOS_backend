import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsDateString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PassStatus } from '../enum/pass-status.enum';

export class CreateVisitorPassDto {
  @IsUUID()
  @IsNotEmpty()
  visitor_id: string;

  @IsOptional()
  @IsUUID()
  visitor_visit_id?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  issuer?: string;

  @IsEnum(PassStatus)
  @IsNotEmpty()
  pass_status: PassStatus;

  @IsDateString()
  @IsNotEmpty()
  validity_start: Date | string;

  @IsDateString()
  @IsNotEmpty()
  validity_end: Date | string;
}
