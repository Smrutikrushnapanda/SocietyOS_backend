import { UserRole } from './user-role.entity';
export declare class Organization {
    id: string;
    name: string;
    identifier: string;
    address: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    userRoles: UserRole[];
}
