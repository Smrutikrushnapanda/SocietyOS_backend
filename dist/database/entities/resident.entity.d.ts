import { User } from './user.entity';
import { Organization } from './organization.entity';
import { Flat } from './flat.entity';
export declare class Resident {
    id: string;
    user_id: string;
    organization_id: string;
    flat_id: string;
    kyc_status: 'PENDING' | 'VERIFIED' | 'REJECTED';
    isActive: boolean;
    app_access_status: boolean;
    createdAt: Date;
    updatedAt: Date;
    user: User;
    organization: Organization;
    flat: Flat;
}
