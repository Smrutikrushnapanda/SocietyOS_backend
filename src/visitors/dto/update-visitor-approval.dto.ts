import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApprovalStatus } from '../enum/approval-status.enum';

export class UpdateVisitorApprovalDto {
  @IsEnum(ApprovalStatus)
  @IsOptional()
  approval_status?: ApprovalStatus;

  @IsOptional()
  approved_at?: string;

  @IsOptional()
  rejected_at?: string;

  @IsString()
  @IsOptional()
  organization_id?: string;
}
