import { DataSource } from 'typeorm';
import { Poll } from '../database/entities/poll.entity';
import { CreatePollDto } from './dto';
import { VotePollDto } from './dto';
import { AuditService } from '../audit/audit.service';
export declare class PollService {
    private readonly dataSource;
    private readonly auditService;
    constructor(dataSource: DataSource, auditService: AuditService);
    private buildAuditOptions;
    private emitAudit;
    create(createDto: CreatePollDto, authenticatedUserId: string, orgContext: any): Promise<Poll>;
    findAll(orgContext: any): Promise<Poll[]>;
    findOne(id: string, orgContext: any): Promise<Poll | null>;
    start(id: string, orgContext: any): Promise<Poll | null>;
    end(id: string, orgContext: any): Promise<Poll | null>;
    vote(voteDto: VotePollDto, authenticatedResidentId: string, orgContext: any): Promise<any>;
    getResults(pollId: string, orgContext: any): Promise<any>;
}
