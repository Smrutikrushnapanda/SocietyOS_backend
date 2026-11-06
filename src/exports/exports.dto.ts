import { IsDateString, IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import {
  BOOLEAN_FILTERS,
  COMPLAINT_PRIORITIES,
  COMPLAINT_STATUSES,
  MAINTENANCE_DUE_STATUSES,
  NOTICE_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  POLL_STATUSES,
  RESIDENT_KYC_STATUSES,
  VISITOR_VISIT_STATUSES,
} from '../reports/reports.dto';

/**
 * Phase 10 - Step 4 (CSV Exports) query DTOs.
 *
 * IMPORTANT:
 *  - NO organization_id / organizationId property exists on any export DTO.
 *    The organization scope is ALWAYS the resolved organization from
 *    OrganizationContextService (req.orgContext.organizationId), so a client
 *    supplied organization_id is dropped by the global ValidationPipe
 *    (whitelist: true) and can never widen the scope.
 *  - NO page / limit / columns parameters. Exports are bounded by the fixed
 *    EXPORT_MAX_ROWS (5000) server-side cap.
 *  - Filters mirror the corresponding read report exactly; no extra filters.
 */
const BILLING_PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Inclusive ISO date / timestamp range (from > to is rejected with 400). */
export class ExportDateRangeDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

/** GET /exports/residents — mirrors the residents report (NO date range). */
export class ResidentsExportQueryDto {
  @IsOptional()
  @IsIn(RESIDENT_KYC_STATUSES)
  kyc_status?: string;

  @IsOptional()
  @IsIn(BOOLEAN_FILTERS)
  app_access?: string;

  @IsOptional()
  @IsIn(BOOLEAN_FILTERS)
  active?: string;

  @IsOptional()
  @IsUUID()
  building_id?: string;

  @IsOptional()
  @IsUUID()
  floor_id?: string;

  @IsOptional()
  @IsUUID()
  flat_id?: string;
}

/** GET /exports/visitors */
export class VisitorsExportQueryDto extends ExportDateRangeDto {
  @IsOptional()
  @IsIn(VISITOR_VISIT_STATUSES)
  visit_status?: string;

  @IsOptional()
  @IsUUID()
  visitor_id?: string;
}

/** GET /exports/maintenance-dues */
export class MaintenanceDuesExportQueryDto extends ExportDateRangeDto {
  @IsOptional()
  @IsIn(MAINTENANCE_DUE_STATUSES)
  status?: string;

  @IsOptional()
  @IsUUID()
  flat_id?: string;

  @IsOptional()
  @IsUUID()
  building_id?: string;

  @IsOptional()
  @Matches(BILLING_PERIOD_PATTERN)
  billing_period?: string;

  @IsOptional()
  @IsIn(BOOLEAN_FILTERS)
  has_late_charge?: string;
}

/** GET /exports/payments */
export class PaymentsExportQueryDto extends ExportDateRangeDto {
  @IsOptional()
  @IsIn(PAYMENT_STATUSES)
  payment_status?: string;

  @IsOptional()
  @IsIn(PAYMENT_METHODS)
  payment_method?: string;

  @IsOptional()
  @IsUUID()
  flat_id?: string;

  @IsOptional()
  @IsUUID()
  building_id?: string;

  @IsOptional()
  @IsUUID()
  resident_id?: string;

  @IsOptional()
  @IsUUID()
  maintenance_due_id?: string;
}

/** GET /exports/complaints */
export class ComplaintsExportQueryDto extends ExportDateRangeDto {
  @IsOptional()
  @IsIn(COMPLAINT_STATUSES)
  status?: string;

  @IsOptional()
  @IsIn(COMPLAINT_PRIORITIES)
  priority?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsUUID()
  assigned_to?: string;

  @IsOptional()
  @IsUUID()
  flat_id?: string;

  @IsOptional()
  @IsUUID()
  building_id?: string;
}

/** GET /exports/notices */
export class NoticesExportQueryDto extends ExportDateRangeDto {
  @IsOptional()
  @IsIn(NOTICE_STATUSES)
  status?: string;
}

/** GET /exports/polls */
export class PollsExportQueryDto extends ExportDateRangeDto {
  @IsOptional()
  @IsIn(POLL_STATUSES)
  status?: string;
}
