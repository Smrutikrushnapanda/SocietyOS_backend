export declare const REQUIRED_PERMISSION_KEY = "requiredPermission";
export declare const REQUIRED_SOCIETY_ID_KEY = "requiredSocietyId";
export declare const REQUIRED_ORGANIZATION_ID_KEY = "requiredOrganizationId";
export declare const RequirePermission: (permission: string) => import("@nestjs/common").CustomDecorator<string>;
export declare const RequireSocietyId: (societyId: string) => import("@nestjs/common").CustomDecorator<string>;
export declare const RequireOrganizationId: (organizationId?: string) => import("@nestjs/common").CustomDecorator<string>;
