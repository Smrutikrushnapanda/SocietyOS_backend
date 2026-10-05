import { RolePermission } from './role-permission.entity';
export declare class Permission {
    id: string;
    name: string;
    description: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    rolePermissions: RolePermission[];
}
