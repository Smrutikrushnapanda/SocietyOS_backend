import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Phase 10 — Step 3 (Reports Foundation) query DTOs.
 *
 * IMPORTANT:
 *  - There is deliberately NO organization_id / organizationId property on any
 *    report DTO. The organization scope is ALWAYS the resolved organization
 *    from OrganizationContextService (req.orgContext.organizationId).
 *    A client supplied organization_id is therefore dropped by the global
 *    ValidationPipe (whitelist: true) and can never widen the scope.
 *  - Pagination is server-side, validated and bounded.
 *  - Client selected columns / raw SQL are not supported anywhere.
 */

export const REPORT_DEFAULT_PAGE_SIZE = 25;
export const REPORT_MAX_PAGE_SIZE = 200;

/** Allowed filter values — derived from the existing Phase 1-9 entities/services. */
export const RESIDENT_KYC_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED'] as const;
export const VISITOR_VISIT_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED',
] as const;
export const MAINTENANCE_DUE_STATUSES = [
  'PENDING',
  'OVERDUE',
  'PAID',
] as const;
export const PAYMENT_STATUSES = [
  'PENDING',
  'COMPLETED',
  'FAILED',
  'REFUNDED',
] as const;
export const PAYMENT_METHODS = [
  'CASH',
  'UPI',
  'NET_BANKING',
  'CHEQUE',
  'CARD',
] as const;
export const COMPLAINT_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'REJECTED',
  'RESOLVED',
  'CLOSED',
] as const;
export const COMPLAINT_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
/** Notice statuses include the approved scheduled publication workflow. */
export const NOTICE_STATUSES = ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'] as const;
/** Poll statuses are exactly these three. */
export const POLL_STATUSES = ['DRAFT', 'PUBLISHED', 'CLOSED'] as const;
export const BOOLEAN_FILTERS = ['true', 'false'] as const;

const BILLING_PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Server-side pagination. Rejected (400) when out of bounds. */
export class ReportPaginationDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(REPORT_MAX_PAGE_SIZE)
  limit: number = REPORT_DEFAULT_PAGE_SIZE;
}

/**
 * Base for reports supporting an inclusive ISO date / timestamp range filter.
 * from > to is rejected (400) by the service; the DTO enforces ISO validity.
 */
export class ReportDateRangeDto extends ReportPaginationDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

/** GET /reports/residents */
export class ResidentsReportQueryDto extends ReportPaginationDto {
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

/** GET /reports/visitors */
export class VisitorsReportQueryDto
  extends ReportDateRangeDto
{
  @IsOptional()
  @IsIn(VISITOR_VISIT_STATUSES)
  visit_status?: string;

  @IsOptional()
  @IsUUID()
  visitor_id?: string;
}

/** GET /reports/maintenance-dues */
export class MaintenanceDuesReportQueryDto
  extends ReportDateRangeDto
{
  @IsOptional()
  @IsIn(MAINTENANCE_DUE_STATUSES)
  status?: string;

  @IsOptional()
  @IsUUID()
  flat_id?: string;

  @IsOptional()
  @IsUUID()
  building_id?: string;

  /** Billing period as YYYY-MM (matches billing_period_start). */
  @IsOptional()
  @Matches(BILLING_PERIOD_PATTERN)
  billing_period?: string;

  @IsOptional()
  @IsIn(BOOLEAN_FILTERS)
  has_late_charge?: string;
}

/** GET /reports/payments */
export class PaymentsReportQueryDto
  extends ReportDateRangeDto
{
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

/** GET /reports/complaints */
export class ComplaintsReportQueryDto
  extends ReportDateRangeDto
{
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

/** GET /reports/notices */
export class NoticesReportQueryDto
  extends ReportDateRangeDto
{
  @IsOptional()
  @IsIn(NOTICE_STATUSES)
  status?: string;
}

/** GET /reports/polls (aggregate results only) */
export class PollsReportQueryDto
  extends ReportDateRangeDto
{
  @IsOptional()
  @IsIn(POLL_STATUSES)
  status?: string;
}
