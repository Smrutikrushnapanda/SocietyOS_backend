import { PollOption } from './poll-option.entity';
import { Resident } from './resident.entity';
export declare class PollVote {
    id: string;
    poll_id: string;
    option_id: string;
    resident_id: string;
    organization_id: string;
    created_at: Date;
    option: PollOption;
    resident: Resident;
}
