import { User } from './user.entity';
import { Role } from './role.entity';
import { Organization } from './organization.entity';
export declare class UserRole {
    id: string;
    userId: string;
    roleId: string;
    organization_id: string;
    assignedAt: Date;
    user: User;
    role: Role;
    organization: Organization;
}
