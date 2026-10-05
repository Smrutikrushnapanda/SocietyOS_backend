import { UserRole } from './user-role.entity';
import { RolePermission } from './role-permission.entity';
export declare class Role {
    id: string;
    name: string;
    organization_id: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    userRoles: UserRole[];
    rolePermissions: RolePermission[];
}
