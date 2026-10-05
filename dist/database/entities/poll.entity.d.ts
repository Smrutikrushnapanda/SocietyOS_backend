import { Organization } from './organization.entity';
import { User } from './user.entity';
import { PollOption } from './poll-option.entity';
export declare class Poll {
    id: string;
    organization_id: string;
    title: string;
    description: string | null;
    status: string;
    starts_at: Date;
    ends_at: Date;
    created_by: string;
    created_at: Date;
    updated_at: Date;
    organization: Organization;
    createdByUser: User;
    options: PollOption[];
}
