import { Poll } from './poll.entity';
import { Resident } from './resident.entity';
export declare class PollOption {
    id: string;
    poll_id: string;
    organization_id: string;
    option_text: string;
    display_order: number;
    created_at: Date;
    poll: Poll;
    resident: Resident;
}
