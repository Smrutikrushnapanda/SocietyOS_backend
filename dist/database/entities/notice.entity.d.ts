import { Organization } from './organization.entity';
import { User } from './user.entity';
export declare class Notice {
    id: string;
    organization_id: string;
    title: string;
    content: string;
    status: string;
    published_at: Date | null;
    expires_at: Date;
    created_by: string;
    created_at: Date;
    updated_at: Date;
    organization: Organization;
    createdByUser: User;
}
