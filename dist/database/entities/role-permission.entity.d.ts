import { Role } from './role.entity';
import { Permission } from './permission.entity';
export declare class RolePermission {
    roleId: string;
    permissionId: string;
    role: Role;
    permission: Permission;
    grantedAt: boolean;
    createdAt: Date;
    updatedAt: Date;
}
