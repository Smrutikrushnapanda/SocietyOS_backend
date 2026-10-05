import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_PERMISSION_KEY } from '../authorization/require-permission.decorator';
import { AuthorizationService } from '../authorization/authorization.service';

/**
 * Phase 10 — Step 3: report-scoped permission enforcement.
 *
 * The shared PermissionGuard is metadata-only and does not enforce at runtime.
 * To avoid altering behavior of any other phase, this guard enforces the
 * permission declared via @RequirePermission(...) using the existing
 * centralized AuthorizationService, and it is applied ONLY to the reports
 * controller.
 *
 * Organization resolution is NOT reimplemented here: it reads the resolved
 * context produced by the existing OrganizationGuard (request.orgContext),
 * which for SUPER_ADMIN requires a valid X-Organization-Id header.
 */
@Injectable()
export class ReportAuthorizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId: string | undefined = request.user?.id;
    if (!userId) {
      return false;
    }

    const requiredPermission = this.reflector.getAllAndOverride<string>(
      REQUIRED_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Secure default: no declared permission => deny.
    if (!requiredPermission) {
      return false;
    }

    const orgContext = request.orgContext ?? {};
    const targetOrganizationId: string | undefined =
      orgContext.targetOrganizationId ??
      orgContext.organizationId ??
      undefined;

    return this.authorizationService.hasPermission(
      userId,
      requiredPermission,
      targetOrganizationId,
    );
  }
}
