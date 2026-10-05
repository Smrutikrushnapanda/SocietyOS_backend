import { SetMetadata } from '@nestjs/common';

export const REQUIRED_ORGANIZATION_ID_KEY = 'requiredOrganizationId';

export const RequireOrganizationId = (organizationId: string) =>
  SetMetadata(REQUIRED_ORGANIZATION_ID_KEY, organizationId);
