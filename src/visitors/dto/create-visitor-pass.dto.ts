import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsDate,
} from 'class-validator';
import { PassStatus } from '../enum/pass-status.enum';

export class CreateVisitorPassDto {
  @IsString()
  @IsNotEmpty()
  visitor_id: string;

  @IsOptional()
  visitor_visit_id?: string;

  @IsString()
  @IsOptional()
  issuer?: string;

  @IsEnum(PassStatus)
  @IsNotEmpty()
  pass_status: PassStatus;

  @IsDate()
  @IsNotEmpty()
  validity_start: Date;

  @IsDate()
  @IsNotEmpty()
  validity_end: Date;

  @IsString()
  @IsNotEmpty()
  organization_id: string;
}
