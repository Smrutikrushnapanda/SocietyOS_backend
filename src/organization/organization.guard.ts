import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrganizationContextService } from './organization-context.service';
import { REQUIRED_ORGANIZATION_ID_KEY } from '../authorization/require-permission.decorator';

@Injectable()
export class OrganizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly organizationContextService: OrganizationContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // 1. Confirm authentication - user must have a userId on the request
    const userId = request.user?.id;
    if (!userId) {
      return false;
    }

    // 2. Get organization context
    const orgContext =
      await this.organizationContextService.getCurrentOrganization(request);

    // 3. Check if organization-scoped operation.
    //    Phase 11 Step 2: @RequireOrganizationId() marks a route as
    //    organization-scoped (the legacy 'requiresOrganization' key is kept
    //    for compatibility). Without a resolved organization context the
    //    route is denied — this covers SUPER_ADMIN without a valid
    //    X-Organization-Id and users without any user_roles membership.
    const requiresOrganization =
      this.reflector.getAllAndOverride(
        'requiresOrganization',
        [context.getHandler(), context.getClass()],
      ) ||
      this.reflector.getAllAndOverride(
        REQUIRED_ORGANIZATION_ID_KEY,
        [context.getHandler(), context.getClass()],
      );

    if (requiresOrganization && !orgContext.organizationId) {
      console.log(`[OrganizationGuard DENY] path: ${request.method} ${request.url}, userId: ${userId}, orgId: ${orgContext.organizationId}, isSuperAdmin: ${orgContext.isSuperAdmin}, header: ${request.headers['x-organization-id']}`);
      return false;
    }

    // 4. Enforce organization isolation
    if (!orgContext.isSuperAdmin && orgContext.organizationId) {
      // Normal user - organization isolation enforced at query level
    }

    // 5. Store organization context on request for use in controllers/services
    request.orgContext = orgContext;

    return true;
  }
}
