import { DataSource } from 'typeorm';
export type OrganizationContext = {
    userId: string | null;
    organizationId: string | null;
    isSuperAdmin: boolean;
    isCrossOrganization: boolean;
    targetOrganizationId: string | null;
};
type AuthRequest = Request & {
    user: {
        id: string;
        mobileNumber?: string;
    };
};
export declare class OrganizationContextService {
    private readonly dataSource;
    constructor(dataSource: DataSource);
    getCurrentOrganization(request: AuthRequest): Promise<OrganizationContext>;
    getOrganizationId(request: AuthRequest): Promise<string | null>;
    getTargetOrganizationId(request: AuthRequest): Promise<string | null>;
    isSuperAdmin(request: AuthRequest): Promise<boolean>;
    isCrossOrganization(request: AuthRequest): Promise<boolean>;
}
export {};
