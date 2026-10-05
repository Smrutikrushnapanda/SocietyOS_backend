import { PollService } from './poll.service';
import { CreatePollDto } from './dto';
import { VotePollDto } from './dto';
import { Poll } from '../database/entities/poll.entity';
export declare class PollController {
    private readonly pollService;
    constructor(pollService: PollService);
    create(createDto: CreatePollDto, req: any): Promise<Poll>;
    findAll(req: any): Promise<Poll[]>;
    findOne(req: any, id: string): Promise<Poll | null>;
    start(req: any, id: string): Promise<Poll | null>;
    end(req: any, id: string): Promise<Poll | null>;
    vote(req: any, voteDto: VotePollDto): Promise<any>;
    getResults(req: any, id: string): Promise<any>;
}
