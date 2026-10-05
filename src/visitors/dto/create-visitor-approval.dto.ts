import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ApprovalStatus } from '../enum/approval-status.enum';

export class CreateVisitorApprovalDto {
  @IsString()
  @IsNotEmpty()
  visitor_visit_id: string;

  @IsEnum(ApprovalStatus)
  @IsNotEmpty()
  approval_status: ApprovalStatus;

  @IsString()
  @IsOptional()
  approver_id?: string;

  @IsOptional()
  approved_at?: string;

  @IsOptional()
  rejected_at?: string;

  @IsString()
  @IsNotEmpty()
  organization_id: string;
}
