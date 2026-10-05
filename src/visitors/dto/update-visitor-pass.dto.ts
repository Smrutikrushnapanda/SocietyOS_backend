import { IsString, IsEnum, IsOptional, IsDate } from 'class-validator';
import { PassStatus } from '../enum/pass-status.enum';

export class UpdateVisitorPassDto {
  @IsEnum(PassStatus)
  @IsOptional()
  pass_status?: PassStatus;

  @IsOptional()
  validity_start?: Date;

  @IsOptional()
  validity_end?: Date;

  @IsString()
  @IsOptional()
  organization_id?: string;
}
