import { UserRole } from './user-role.entity';
export declare class User {
    id: string;
    mobileNumber: string;
    isAuthenticated: boolean;
    refreshTokenId: string;
    lastLoginAt: Date;
    createdAt: Date;
    updatedAt: Date;
    userRoles: UserRole[];
}
