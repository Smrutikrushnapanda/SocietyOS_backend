import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrganizationContextService } from './organization-context.service';

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

    // 3. Check if organization-scoped operation
    const requiresOrganization = this.reflector.getAllAndOverride(
      'requiresOrganization',
      [context.getHandler(), context.getClass()],
    );

    if (requiresOrganization && !orgContext.organizationId) {
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
