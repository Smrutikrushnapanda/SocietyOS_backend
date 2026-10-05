import {
  Controller,
  ForbiddenException,
  Get,
  Header,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrganizationGuard } from '../organization/organization.guard';
import {
  RequirePermission,
  RequireOrganizationId,
} from '../authorization/require-permission.decorator';
import { ExportsService } from './exports.service';
import { ExportAuthorizationGuard } from './exports.guard';
import {
  ComplaintsExportQueryDto,
  MaintenanceDuesExportQueryDto,
  NoticesExportQueryDto,
  PaymentsExportQueryDto,
  PollsExportQueryDto,
  ResidentsExportQueryDto,
  VisitorsExportQueryDto,
} from './exports.dto';

/**
 * Phase 10 - Step 4: synchronous CSV exports (exactly 7 endpoints).
 *
 *   GET /exports/residents
 *   GET /exports/visitors
 *   GET /exports/maintenance-dues
 *   GET /exports/payments
 *   GET /exports/complaints
 *   GET /exports/notices
 *   GET /exports/polls
 *
 * There is deliberately NO occupancy export and NO audit-log export.
 *
 * Security:
 *  - AuthGuard + OrganizationGuard + ExportAuthorizationGuard (report:export),
 *    the same local guard pattern as Audit/Reports. Only SUPER_ADMIN and
 *    SOCIETY_ADMIN hold report:export; RESIDENT/GUARD are denied.
 *  - The organization scope is ALWAYS req.orgContext.organizationId (a valid
 *    X-Organization-Id is required for SUPER_ADMIN). A supplied organization_id
 *    in the query NEVER overrides it and is stripped by the ValidationPipe.
 *  - Exports are read-only and create no audit events.
 *
 * Response: text/csv; charset=utf-8 with Content-Disposition attachment and
 * X-Export-Truncated: true|false. The raw response is sent directly so the
 * global JSON TransformInterceptor cannot wrap the CSV body.
 */
@Controller('exports')
@UseGuards(AuthGuard, OrganizationGuard, ExportAuthorizationGuard)
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get('residents')
  @RequirePermission('report:export')
  @RequireOrganizationId()
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('X-Content-Type-Options', 'nosniff')
  async exportResidents(
    @Request() req: any,
    @Query() query: ResidentsExportQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    await this.send(
      res,
      this.exportsService.exportResidents(
        this.resolveOrganizationId(req),
        query ?? new ResidentsExportQueryDto(),
      ),
    );
  }

  @Get('visitors')
  @RequirePermission('report:export')
  @RequireOrganizationId()
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('X-Content-Type-Options', 'nosniff')
  async exportVisitors(
    @Request() req: any,
    @Query() query: VisitorsExportQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    await this.send(
      res,
      this.exportsService.exportVisitors(
        this.resolveOrganizationId(req),
        query ?? new VisitorsExportQueryDto(),
      ),
    );
  }

  @Get('maintenance-dues')
  @RequirePermission('report:export')
  @RequireOrganizationId()
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('X-Content-Type-Options', 'nosniff')
  async exportMaintenanceDues(
    @Request() req: any,
    @Query() query: MaintenanceDuesExportQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    await this.send(
      res,
      this.exportsService.exportMaintenanceDues(
        this.resolveOrganizationId(req),
        query ?? new MaintenanceDuesExportQueryDto(),
      ),
    );
  }

  @Get('payments')
  @RequirePermission('report:export')
  @RequireOrganizationId()
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('X-Content-Type-Options', 'nosniff')
  async exportPayments(
    @Request() req: any,
    @Query() query: PaymentsExportQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    await this.send(
      res,
      this.exportsService.exportPayments(
        this.resolveOrganizationId(req),
        query ?? new PaymentsExportQueryDto(),
      ),
    );
  }

  @Get('complaints')
  @RequirePermission('report:export')
  @RequireOrganizationId()
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('X-Content-Type-Options', 'nosniff')
  async exportComplaints(
    @Request() req: any,
    @Query() query: ComplaintsExportQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    await this.send(
      res,
      this.exportsService.exportComplaints(
        this.resolveOrganizationId(req),
        query ?? new ComplaintsExportQueryDto(),
      ),
    );
  }

  @Get('notices')
  @RequirePermission('report:export')
  @RequireOrganizationId()
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('X-Content-Type-Options', 'nosniff')
  async exportNotices(
    @Request() req: any,
    @Query() query: NoticesExportQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    await this.send(
      res,
      this.exportsService.exportNotices(
        this.resolveOrganizationId(req),
        query ?? new NoticesExportQueryDto(),
      ),
    );
  }

  @Get('polls')
  @RequirePermission('report:export')
  @RequireOrganizationId()
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('X-Content-Type-Options', 'nosniff')
  async exportPolls(
    @Request() req: any,
    @Query() query: PollsExportQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    await this.send(
      res,
      this.exportsService.exportPolls(
        this.resolveOrganizationId(req),
        query ?? new PollsExportQueryDto(),
      ),
    );
  }

  /** Send a serialized CSV export with the approved response headers. */
  private async send(
    res: Response,
    pending: Promise<{
      filename: string;
      csv: string;
      truncated: boolean;
      rowCount: number;
    }>,
  ): Promise<void> {
    const result = await pending;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    res.setHeader('X-Export-Truncated', result.truncated ? 'true' : 'false');
    res.setHeader('X-Export-Row-Count', String(result.rowCount));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(result.csv);
  }

  private resolveOrganizationId(req: any): string {
    const organizationId = req?.orgContext?.organizationId;
    if (!organizationId) {
      // Triggered for SUPER_ADMIN without a valid X-Organization-Id, or a user
      // with no organization membership.
      throw new ForbiddenException('Organization context is required');
    }
    return organizationId as string;
  }
}
