import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PERMISSION_KEY = 'requiredPermission';
export const REQUIRED_SOCIETY_ID_KEY = 'requiredSocietyId';
export const REQUIRED_ORGANIZATION_ID_KEY = 'requiredOrganizationId';

export const RequirePermission = (permission: string) =>
  SetMetadata(REQUIRED_PERMISSION_KEY, permission);

export const RequireSocietyId = (societyId: string) =>
  SetMetadata(REQUIRED_SOCIETY_ID_KEY, societyId);

/**
 * Marks a route as organization-scoped.
 *
 * Phase 11 Step 2: the stored value is a defined marker (never `undefined`)
 * so that OrganizationGuard can reliably detect organization-scoped routes
 * via metadata presence. The organization itself is ALWAYS resolved from the
 * authenticated user's user_roles membership (or, for SUPER_ADMIN, the
 * validated X-Organization-Id header) — never from this decorator's value.
 */
export const RequireOrganizationId = (organizationId?: string) =>
  SetMetadata(REQUIRED_ORGANIZATION_ID_KEY, organizationId ?? true);
