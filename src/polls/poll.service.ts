import { Injectable, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Poll } from '../database/entities/poll.entity';
import { PollOption } from '../database/entities/poll-option.entity';
import { PollVote } from '../database/entities/poll-vote.entity';
import { CreatePollDto } from './dto';
import { VotePollDto } from './dto';
import { UpdatePollDto } from './dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/audit.enums';
import { AuditCallContext, extractRequestMeta, recordAudit, resolveAuditContext, toSnapshot } from '../audit/audit-context';

@Injectable()
export class PollService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  private buildAuditOptions(passed?: AuditCallContext, entityOrganizationId?: string | null, actorUserId?: string | null): AuditCallContext {
    return {
      orgContext: (passed?.orgContext ?? null) as any,
      actorUserId: passed?.actorUserId ?? actorUserId ?? null,
      entityOrganizationId: passed?.entityOrganizationId ?? entityOrganizationId ?? null,
      request: passed?.request,
    };
  }

  private emitAudit(action: AuditAction, entityType: AuditEntityType, entityId: string | null, oldValues: Record<string, unknown> | null, newValues: Record<string, unknown> | null, options?: AuditCallContext): void {
    const opts = this.buildAuditOptions(options, (newValues as any)?.organization_id ?? (oldValues as any)?.organization_id ?? options?.entityOrganizationId ?? null, options?.actorUserId ?? null);
    const ctx = resolveAuditContext({ orgContext: opts.orgContext as any, actorUserId: opts.actorUserId ?? undefined, entityOrganizationId: opts.entityOrganizationId ?? undefined });
    const meta = extractRequestMeta(opts.request);
    void recordAudit(this.auditService as any, { ...ctx, action, entity_type: entityType, entity_id: entityId, old_values: oldValues, new_values: newValues, ...meta } as never);
  }

  async create(createDto: CreatePollDto, authenticatedUserId: string, orgContext: any): Promise<Poll> {
    // organization_id is derived from orgContext
    const orgId = orgContext?.organizationId;

    const poll: Poll = this.dataSource
      .getRepository(Poll)
      .create({
        id: createDto.id,
        organization_id: orgId,
        title: createDto.title,
        description: createDto.description,
        status: 'DRAFT',
        starts_at: createDto.starts_at,
        ends_at: createDto.ends_at,
        created_by: authenticatedUserId,
        created_at: new Date(),
        updated_at: new Date,
      });
    const saved = await this.dataSource.getRepository(Poll).save(poll);
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (saved as any).organization_id,
      }),
      action: AuditAction.CREATE,
      entity_type: AuditEntityType.POLL,
      entity_id: (saved as any).id ?? null,
      old_values: null,
      new_values: toSnapshot(saved),
      ...extractRequestMeta(undefined),
    } as never);
    return saved;
  }

  async findAll(orgContext: any): Promise<Poll[]> {
    const orgId = orgContext.organizationId;
    return this.dataSource
      .getRepository(Poll)
      .find({ where: { organization_id: orgId } });
  }

  async findOne(id: string, orgContext: any): Promise<Poll | null> {
    const orgId = orgContext.organizationId;
    return this.dataSource.getRepository(Poll).findOne({ where: { id, organization_id: orgId } });
  }

  async start(id: string, orgContext: any): Promise<Poll | null> {
    const orgId = orgContext.organizationId;
    const poll = await this.findOne(id, orgContext);
    if (!poll) return null;

    // Only DRAFT -> PUBLISHED transition
    if (poll.status !== 'DRAFT') {
      throw new ForbiddenException(
        `Invalid transition from ${poll.status} to PUBLISHED`
      );
    }

    const oldValues = toSnapshot(poll);
    poll.status = 'PUBLISHED';
    poll.updated_at = new Date;
    const saved = await this.dataSource.getRepository(Poll).save(poll);
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (saved as any).organization_id,
      }),
      action: AuditAction.START,
      entity_type: AuditEntityType.POLL,
      entity_id: (saved as any).id ?? null,
      old_values: oldValues,
      new_values: toSnapshot(saved),
      ...extractRequestMeta(undefined),
    } as never);
    return saved;
  }

  async end(id: string, orgContext: any): Promise<Poll | null> {
    const orgId = orgContext.organizationId;
    const poll = await this.findOne(id, orgContext);
    if (!poll) return null;

    // Only PUBLISHED -> CLOSED transition
    if (poll.status !== 'PUBLISHED') {
      throw new ForbiddenException(
        `Invalid transition from ${poll.status} to CLOSED`
      );
    }

    const oldValues = toSnapshot(poll);
    poll.status = 'CLOSED';
    poll.updated_at = new Date;
    const saved = await this.dataSource.getRepository(Poll).save(poll);
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (saved as any).organization_id,
      }),
      action: AuditAction.END,
      entity_type: AuditEntityType.POLL,
      entity_id: (saved as any).id ?? null,
      old_values: oldValues,
      new_values: toSnapshot(saved),
      ...extractRequestMeta(undefined),
    } as never);
    return saved;
  }

  async vote(voteDto: VotePollDto, authenticatedResidentId: string, orgContext: any): Promise<any> {
    const orgId = orgContext.organizationId;

    // 1. Check if resident already voted (unique constraint)
    const existingVote = await this.dataSource
      .getRepository(PollVote)
      .findOne({ where: { poll_id: voteDto.poll_id, resident_id: authenticatedResidentId } });
    if (existingVote) {
      throw new ForbiddenException('Resident has already voted in this poll');
    }

    // 2. Validate poll exists and get its organization
    const poll = await this.findOne(voteDto.poll_id, orgContext);
    if (!poll) {
      throw new ForbiddenException('Poll not found');
    }

    // 3. Validate poll status: resident can only vote on PUBLISHED polls
    if (poll.status !== 'PUBLISHED') {
      throw new ForbiddenException('Voting is only allowed on published polls');
    }

    // 4. Validate voting time window
    const now = new Date();
    if (now < poll.starts_at) {
      throw new ForbiddenException('Poll has not started yet');
    }
    if (now > poll.ends_at) {
      throw new ForbiddenException('Poll has ended');
    }

    // 5. Validate option belongs to the poll and same organization
    const option = await this.dataSource
      .getRepository(PollOption)
      .findOne({ where: { id: voteDto.option_id, poll_id: voteDto.poll_id } });
    if (!option) {
      throw new ForbiddenException('Invalid poll option');
    }

    // 6. Validate option belongs to same organization as poll
    if (option.organization_id !== poll.organization_id) {
      throw new ForbiddenException('Poll option does not belong to this poll\'s organization');
    }

    // 7. Validate resident belongs to the target organization
    const resident = await this.dataSource.getRepository('Resident').findOne({
      where: { id: authenticatedResidentId, organization_id: orgId },
    });
    if (!resident) {
      throw new ForbiddenException('Resident does not belong to this organization');
    }

    // 8. Create the vote
    const vote: PollVote = this.dataSource
      .getRepository(PollVote)
      .create({
        id: voteDto.id,
        poll_id: voteDto.poll_id,
        option_id: voteDto.option_id,
        resident_id: authenticatedResidentId,
        organization_id: orgId,
        created_at: new Date,
      });
    const saved = await this.dataSource.getRepository(PollVote).save(vote);
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (poll as any).organization_id,
      }),
      action: AuditAction.VOTE,
      entity_type: AuditEntityType.POLL,
      entity_id: (poll as any).id ?? null,
      old_values: null,
      new_values: toSnapshot(saved),
      ...extractRequestMeta(undefined),
    } as never);
    return saved;
  }

  async getResults(pollId: string, orgContext: any): Promise<any> {
    const orgId = orgContext.organizationId;
    const votes = await this.dataSource
      .getRepository(PollVote)
      .find({ where: { poll_id: pollId, organization_id: orgId } });

    // Count votes per option
    const optionCounts: Record<string, number> = {};
    votes.forEach(vote => {
      optionCounts[vote.option_id] = (optionCounts[vote.option_id] || 0) + 1;
    });

    const options = await this.dataSource
      .getRepository(PollOption)
      .find({ where: { poll_id: pollId } });

    return options.map(option => ({
      id: option.id,
      option_text: option.option_text,
      display_order: option.display_order,
      vote_count: optionCounts[option.id] || 0,
    }));
  }
}