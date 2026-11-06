import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { ApprovalStatus } from '../enum/approval-status.enum';

export class CreateVisitorApprovalDto {
  @IsUUID()
  @IsNotEmpty()
  visitor_visit_id: string;

  @IsEnum(ApprovalStatus)
  @IsNotEmpty()
  approval_status: ApprovalStatus;

  @IsUUID()
  @IsOptional()
  approver_id?: string;

  @IsDateString()
  @IsOptional()
  approved_at?: string;

  @IsDateString()
  @IsOptional()
  rejected_at?: string;
}
