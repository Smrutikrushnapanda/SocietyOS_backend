import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  REQUIRED_PERMISSION_KEY,
  REQUIRED_SOCIETY_ID_KEY,
  REQUIRED_ORGANIZATION_ID_KEY,
} from './require-permission.decorator';

@Injectable()
export class PermissionGuard {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // 1. Confirm authentication - user must have a userId on the request
    const userId = request.user?.id;
    if (!userId) {
      return false;
    }

    // 2. Determine the required permission from decorator metadata
    const requiredPermission = this.reflector.getAllAndOverride(
      REQUIRED_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermission) {
      return false;
    }

    // 3. Determine target organization/society ID from decorator metadata
    // Prefer @RequireOrganizationId, fall back to @RequireSocietyId
    const targetOrganizationId = this.reflector.getAllAndOverride(
      REQUIRED_ORGANIZATION_ID_KEY,
      [context.getHandler(), context.getClass()],
    );
    const targetSocietyId = this.reflector.getAllAndOverride(
      REQUIRED_SOCIETY_ID_KEY,
      [context.getHandler(), context.getClass()],
    );
    const targetId = targetOrganizationId || targetSocietyId;

    // 4. Authorization validation is handled by AuthorizationService
    // This guard confirms authentication and presence of required permission metadata

    return true;
  }
}
