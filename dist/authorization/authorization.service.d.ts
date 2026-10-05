import { DataSource } from 'typeorm';
import { Role } from '../database/entities/role.entity';
import { UserRole } from '../database/entities/user-role.entity';
export declare class AuthorizationService {
    private readonly dataSource;
    constructor(dataSource: DataSource);
    getUserRole(userId: string): Promise<{
        userRole: UserRole;
        role: Role;
    } | null>;
    getUserPermissions(userId: string, targetOrganizationId?: string): Promise<{
        role: Role | null;
        permissions: string[];
        organizationId: string | null;
    }>;
    hasPermission(userId: string, permissionName: string, targetOrganizationId?: string): Promise<boolean>;
    canAccessOrganization(userId: string, organizationId: string): Promise<boolean>;
    getUserRoleName(userId: string): Promise<string | null>;
    verifyPermission(userId: string, permissionName: string, targetOrganizationId?: string): Promise<{
        allowed: boolean;
        role: string;
        organizationId: string | null;
    }>;
}
