import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
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
import { AuditService } from './audit.service';
import { AuditAuthorizationGuard } from './audit.guard';
import { AuditLogFilters } from './audit.dto';

/**
 * Phase 10 — Audit read API (append-only; read-only endpoints).
 *
 * Endpoints:
 *   GET /audit-logs
 *   GET /audit-logs/:id
 *
 * Security:
 *  - AuthGuard + OrganizationGuard (existing organization resolution).
 *  - audit:read enforced via AuditAuthorizationGuard (@RequirePermission).
 *  - The organization scope is ALWAYS the resolved org from
 *    OrganizationContextService (req.orgContext.organizationId).
 *    A supplied organization_id in query/body NEVER overrides it.
 */
@Controller('audit-logs')
@UseGuards(AuthGuard, OrganizationGuard, AuditAuthorizationGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermission('audit:read')
  @RequireOrganizationId()
  async findAll(
    @Request() req: any,
    @Query() query: Record<string, unknown>,
  ) {
    const organizationId = this.resolveOrganizationId(req);
    return this.auditService.findAll(
      organizationId,
      (query ?? {}) as AuditLogFilters,
    );
  }

  @Get(':id')
  @RequirePermission('audit:read')
  @RequireOrganizationId()
  async findOne(@Request() req: any, @Param('id') id: string) {
    const organizationId = this.resolveOrganizationId(req);
    const record = await this.auditService.findOne(id, organizationId);
    if (!record) {
      // Same response for "missing" and "other organization" (no IDOR leak).
      throw new NotFoundException('Audit log not found');
    }
    return record;
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
