import {
  Controller,
  ForbiddenException,
  Get,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrganizationGuard } from '../organization/organization.guard';
import {
  RequirePermission,
  RequireOrganizationId,
} from '../authorization/require-permission.decorator';
import { ReportsService } from './reports.service';
import { ReportAuthorizationGuard } from './reports.guard';
import {
  ComplaintsReportQueryDto,
  MaintenanceDuesReportQueryDto,
  NoticesReportQueryDto,
  PaymentsReportQueryDto,
  PollsReportQueryDto,
  ResidentsReportQueryDto,
  VisitorsReportQueryDto,
} from './reports.dto';

/**
 * Phase 10 - Step 3: Reports API (read-only).
 *
 * Endpoints (exactly 8):
 *   GET /reports/occupancy
 *   GET /reports/residents
 *   GET /reports/visitors
 *   GET /reports/maintenance-dues
 *   GET /reports/payments
 *   GET /reports/complaints
 *   GET /reports/notices
 *   GET /reports/polls
 *
 * Security:
 *  - AuthGuard + OrganizationGuard (existing organization resolution),
 *  - report:read enforced via ReportAuthorizationGuard (@RequirePermission),
 *    which only SUPER_ADMIN and SOCIETY_ADMIN hold. RESIDENT/GUARD are denied.
 *  - The organization scope is ALWAYS the resolved org from
 *    OrganizationContextService (req.orgContext.organizationId). For
 *    SUPER_ADMIN a valid X-Organization-Id header is required and its
 *    organization becomes the target organization. A supplied organization_id
 *    in the query NEVER overrides it.
 *  - These endpoints never create audit logs.
 */
@Controller('reports')
@UseGuards(AuthGuard, OrganizationGuard, ReportAuthorizationGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('occupancy')
  @RequirePermission('report:read')
  @RequireOrganizationId()
  async getOccupancy(@Request() req: any) {
    return this.reportsService.getOccupancy(this.resolveOrganizationId(req));
  }

  @Get('residents')
  @RequirePermission('report:read')
  @RequireOrganizationId()
  async getResidents(@Request() req: any, @Query() query: ResidentsReportQueryDto) {
    return this.reportsService.getResidents(
      this.resolveOrganizationId(req),
      query ?? new ResidentsReportQueryDto(),
    );
  }

  @Get('visitors')
  @RequirePermission('report:read')
  @RequireOrganizationId()
  async getVisitors(@Request() req: any, @Query() query: VisitorsReportQueryDto) {
    return this.reportsService.getVisitors(
      this.resolveOrganizationId(req),
      query ?? new VisitorsReportQueryDto(),
    );
  }

  @Get('maintenance-dues')
  @RequirePermission('report:read')
  @RequireOrganizationId()
  async getMaintenanceDues(
    @Request() req: any,
    @Query() query: MaintenanceDuesReportQueryDto,
  ) {
    return this.reportsService.getMaintenanceDues(
      this.resolveOrganizationId(req),
      query ?? new MaintenanceDuesReportQueryDto(),
    );
  }

  @Get('payments')
  @RequirePermission('report:read')
  @RequireOrganizationId()
  async getPayments(@Request() req: any, @Query() query: PaymentsReportQueryDto) {
    return this.reportsService.getPayments(
      this.resolveOrganizationId(req),
      query ?? new PaymentsReportQueryDto(),
    );
  }

  @Get('complaints')
  @RequirePermission('report:read')
  @RequireOrganizationId()
  async getComplaints(@Request() req: any, @Query() query: ComplaintsReportQueryDto) {
    return this.reportsService.getComplaints(
      this.resolveOrganizationId(req),
      query ?? new ComplaintsReportQueryDto(),
    );
  }

  @Get('notices')
  @RequirePermission('report:read')
  @RequireOrganizationId()
  async getNotices(@Request() req: any, @Query() query: NoticesReportQueryDto) {
    return this.reportsService.getNotices(
      this.resolveOrganizationId(req),
      query ?? new NoticesReportQueryDto(),
    );
  }

  @Get('polls')
  @RequirePermission('report:read')
  @RequireOrganizationId()
  async getPolls(@Request() req: any, @Query() query: PollsReportQueryDto) {
    return this.reportsService.getPolls(
      this.resolveOrganizationId(req),
      query ?? new PollsReportQueryDto(),
    );
  }

  private resolveOrganizationId(req: any): string {
    const organizationId = req?.orgContext?.organizationId;
    if (!organizationId) {
      // Triggered for SUPER_ADMIN without a valid X-Organization-Id, or a
      // user with no organization membership.
      throw new ForbiddenException('Organization context is required');
    }
    return organizationId as string;
  }
}
