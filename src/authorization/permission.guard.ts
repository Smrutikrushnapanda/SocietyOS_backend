import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_PERMISSION_KEY } from './require-permission.decorator';
import { AuthorizationService } from './authorization.service';

/**
 * Shared permission-enforcement guard.
 *
 * Phase 11 Step 2 (RBAC security matrix): this guard previously only checked
 * for the presence of @RequirePermission metadata and returned true for ANY
 * authenticated user — a real authorization vulnerability. It now enforces
 * the declared permission through the centralized AuthorizationService,
 * using the organization context resolved by OrganizationGuard
 * (request.orgContext). A valid JWT alone never implies permission.
 *
 * Fail-closed:
 *  - no authenticated user            -> deny
 *  - no @RequirePermission metadata   -> deny
 *  - permission not held for the resolved organization -> deny
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // 1. Confirm authentication - user must have a userId on the request
    const userId: string | undefined = request.user?.id;
    if (!userId) {
      return false;
    }

    // 2. Determine the required permission from decorator metadata
    const requiredPermission = this.reflector.getAllAndOverride<string>(
      REQUIRED_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    // Secure default: no declared permission => deny.
    if (!requiredPermission) {
      return false;
    }

    // 3. Resolve the target organization from the guard-resolved context
    //    (never from client-supplied body/query/path values).
    const orgContext = request.orgContext ?? {};
    const targetOrganizationId: string | undefined =
      orgContext.targetOrganizationId ??
      orgContext.organizationId ??
      undefined;

    // 4. Enforce the permission via the centralized AuthorizationService.
    const hasPerm = await this.authorizationService.hasPermission(
      userId,
      requiredPermission,
      targetOrganizationId,
    );
    if (!hasPerm) {
      console.log(`[PermissionGuard DENY] path: ${request.method} ${request.url}, userId: ${userId}, perm: ${requiredPermission}, targetOrg: ${targetOrganizationId}`);
    }
    return hasPerm;
  }
}
