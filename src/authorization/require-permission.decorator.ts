import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PERMISSION_KEY = 'requiredPermission';
export const REQUIRED_SOCIETY_ID_KEY = 'requiredSocietyId';
export const REQUIRED_ORGANIZATION_ID_KEY = 'requiredOrganizationId';

export const RequirePermission = (permission: string) =>
  SetMetadata(REQUIRED_PERMISSION_KEY, permission);

export const RequireSocietyId = (societyId: string) =>
  SetMetadata(REQUIRED_SOCIETY_ID_KEY, societyId);

export const RequireOrganizationId = (organizationId?: string) =>
  SetMetadata(REQUIRED_ORGANIZATION_ID_KEY, organizationId);
