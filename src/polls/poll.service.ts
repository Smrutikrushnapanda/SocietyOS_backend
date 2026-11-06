import { CollectionPageDto, PollPageDto } from '../common/pagination.dto';
import { Injectable, BadRequestException, ForbiddenException, NotFoundException, Optional } from '@nestjs/common';
import { PollDeliveryAdmission } from './poll-delivery-admission';
import { randomUUID } from 'node:crypto';
import { DataSource, In, IsNull, MoreThan, LessThanOrEqual } from 'typeorm';
import { Poll } from '../database/entities/poll.entity';
import { PollOption } from '../database/entities/poll-option.entity';
import { PollVote } from '../database/entities/poll-vote.entity';
import { Resident } from '../database/entities/resident.entity';
import { CreatePollDto, EditPollDto } from './dto';
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
    @Optional() private readonly delivery?: PollDeliveryAdmission,
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
    const orgId = orgContext?.organizationId;
    if (!orgId || !authenticatedUserId) throw new ForbiddenException('Organization and authenticated user are required');
    const startsAt = new Date(createDto.starts_at);
    const endsAt = new Date(createDto.ends_at);
    if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || endsAt <= startsAt) {
      throw new BadRequestException('End date must be after start date');
    }
    const options = createDto.options ?? [];
    if ((createDto.options && options.length < 2) || options.length > 100 || options.some(option => !option.option_text?.trim())) {
      throw new BadRequestException('A poll requires 2 to 100 non-empty options');
    }
    const saved = await this.dataSource.transaction(async manager => {
      const pollRepo = manager.getRepository(Poll);
      const optionRepo = manager.getRepository(PollOption);
      const now = new Date();
      const poll = await pollRepo.save(pollRepo.create({
        id: randomUUID(),
        organization_id: orgId,
        title: createDto.title.trim(),
        description: createDto.description?.trim() || '',
        poll_type: createDto.poll_type ?? 'SINGLE',
        status: 'DRAFT',
        starts_at: startsAt,
        ends_at: endsAt,
        created_by: authenticatedUserId,
        created_at: now,
        updated_at: now,
      }));
      const savedOptions: PollOption[] = [];
      for (const [index, option] of options.entries()) {
        savedOptions.push(await optionRepo.save(optionRepo.create({
          id: randomUUID(), poll_id: poll.id, organization_id: orgId,
          option_text: option.option_text.trim(), display_order: option.display_order ?? index + 1,
          created_at: now,
        })));
      }
      return Object.assign(poll, { options: savedOptions });
    });
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

  async findPage(orgContext: { organizationId?: string }, query: PollPageDto, userId?: string) {
    if (!orgContext.organizationId) throw new ForbiddenException('Organization context is required');
    const { page, limit } = query;
    let restricted = false;
    if (userId) {
      const membership = await this.dataSource.getRepository('UserRole').findOne({ where: { userId, organization_id: orgContext.organizationId }, relations: { role: true } });
      restricted = !membership || ['RESIDENT', 'GUARD'].includes(membership.role?.name);
      if (!membership) {
        const platform = await this.dataSource.getRepository('UserRole').findOne({ where: { userId, organization_id: IsNull() }, relations: { role: true } });
        if (platform?.role?.name === 'SUPER_ADMIN') restricted = false;
      }
    }
    const [items, total] = await this.dataSource.getRepository(Poll).findAndCount({
      where: query.status === 'CLOSED' ? [{ organization_id: orgContext.organizationId, status: 'CLOSED' }, { organization_id: orgContext.organizationId, status: 'PUBLISHED', ends_at: LessThanOrEqual(new Date()) }] : { organization_id: orgContext.organizationId, ...(query.status === 'PUBLISHED' ? { status: 'PUBLISHED', ends_at: MoreThan(new Date()) } : restricted ? { status: In(['PUBLISHED', 'CLOSED']) } : {}) },
      order: { created_at: 'DESC', id: 'DESC' }, skip: (page - 1) * limit, take: limit,
    });
    if (restricted && userId && items.length) {
      const resident = await this.dataSource.getRepository(Resident).findOneBy({ user_id: userId, organization_id: orgContext.organizationId });
      const votes = resident ? await this.dataSource.getRepository(PollVote).find({ where: { resident_id: resident.id, organization_id: orgContext.organizationId, poll_id: In(items.map(poll => poll.id)) }, select: { poll_id: true } }) : [];
      const voted = new Set(votes.map(vote => vote.poll_id));
      for (const item of items) Object.assign(item, { has_voted: voted.has(item.id) });
    }
    return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  async edit(id: string, dto: EditPollDto, orgContext: any): Promise<Poll> {
    const orgId = orgContext?.organizationId;
    if (!orgId) throw new ForbiddenException('Organization context is required');
    const { saved, oldValues } = await this.dataSource.transaction(async manager => {
      const repo = manager.getRepository(Poll);
      const poll = await repo.findOne({ where: { id, organization_id: orgId }, lock: { mode: 'pessimistic_write' } });
      if (!poll) throw new NotFoundException('Poll not found');
      const hasVotes = await manager.getRepository(PollVote).countBy({ poll_id: id, organization_id: orgId }) > 0;
      if (hasVotes && (dto.options !== undefined || (dto.title !== undefined && dto.title.trim() !== poll.title) || (dto.poll_type !== undefined && dto.poll_type !== poll.poll_type) || (dto.starts_at !== undefined && new Date(dto.starts_at).getTime() !== new Date(poll.starts_at).getTime()))) {
        throw new BadRequestException('Votes exist. Question, voting type, start date and options cannot be changed.');
      }
      const start = dto.starts_at === undefined ? new Date(poll.starts_at) : new Date(dto.starts_at);
      const end = dto.ends_at === undefined ? new Date(poll.ends_at) : new Date(dto.ends_at);
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) throw new BadRequestException('End date must be after start date');
      if (dto.title !== undefined && !dto.title.trim()) throw new BadRequestException('Poll title is required');
      const oldValues = toSnapshot(poll);
      if (dto.title !== undefined) poll.title = dto.title.trim();
      if (dto.description !== undefined) poll.description = dto.description.trim();
      if (dto.poll_type !== undefined) poll.poll_type = dto.poll_type;
      poll.starts_at = start; poll.ends_at = end; poll.updated_at = new Date();
      if (dto.options !== undefined) {
        if (dto.options.length < 2 || dto.options.length > 100 || dto.options.some(option => !option.option_text.trim())) throw new BadRequestException('A poll requires 2 to 100 non-empty options');
        const optionsRepo = manager.getRepository(PollOption);
        const existing = await optionsRepo.find({ where: { poll_id: id, organization_id: orgId } });
        const existingIds = new Set(existing.map(option => option.id));
        const suppliedIds = dto.options.flatMap(option => option.id ? [option.id] : []);
        if (new Set(suppliedIds).size !== suppliedIds.length || suppliedIds.some(optionId => !existingIds.has(optionId))) throw new BadRequestException('Invalid poll option ID');
        const removed = existing.filter(option => !suppliedIds.includes(option.id));
        for (const option of removed) await optionsRepo.delete({ id: option.id, poll_id: id, organization_id: orgId });
        for (const [index, option] of dto.options.entries()) await optionsRepo.save(optionsRepo.create({
          id: option.id ?? randomUUID(), poll_id: id, organization_id: orgId,
          option_text: option.option_text.trim(), display_order: index + 1,
          created_at: existing.find(old => old.id === option.id)?.created_at ?? new Date(),
        }));
      }
      return { saved: await repo.save(poll), oldValues };
    });
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({ orgContext, entityOrganizationId: saved.organization_id }),
      action: AuditAction.UPDATE,
      entity_type: AuditEntityType.POLL,
      entity_id: saved.id,
      old_values: oldValues, new_values: toSnapshot(saved), ...extractRequestMeta(undefined),
    } as never);
    return saved;
  }

  async findOne(id: string, orgContext: any): Promise<Poll | null> {
    const orgId = orgContext.organizationId;
    return this.dataSource.getRepository(Poll).findOne({ where: { id, organization_id: orgId } });
  }

  async start(id: string, orgContext: any): Promise<Poll | null> {
    const orgId = orgContext.organizationId;
    if (!orgId) throw new ForbiddenException('Organization context is required');
    const publication = await this.dataSource.transaction(async manager => {
      const repo = manager.getRepository(Poll);
      const poll = await repo.findOne({ where: { id, organization_id: orgId }, lock: { mode: 'pessimistic_write' } });
      if (!poll) return null;
      if (poll.status !== 'DRAFT') throw new ForbiddenException(`Invalid transition from ${poll.status} to PUBLISHED`);
      const oldValues = toSnapshot(poll);
      poll.status = 'PUBLISHED'; poll.updated_at = new Date();
      const saved = await repo.save(poll);
      await this.delivery?.enqueue(manager, saved);
      return { saved, oldValues };
    });
    if (!publication) return null;
    const { saved, oldValues } = publication;
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

  async vote(voteDto: VotePollDto, authenticatedUserIdOrResidentId: string, orgContext: any): Promise<any> {
    const orgId = orgContext?.targetOrganizationId ?? orgContext?.organizationId ?? orgContext?.organization_id;
    if (!orgId) {
      throw new ForbiddenException('Organization context is required');
    }

    // Resolve Resident server-side: req.user.id -> Resident.user_id -> Resident.id
    const resident = await this.dataSource.getRepository(Resident).findOne({
      where: [
        { user_id: authenticatedUserIdOrResidentId, organization_id: orgId },
        { id: authenticatedUserIdOrResidentId, organization_id: orgId },
      ],
    });
    if (!resident) {
      throw new ForbiddenException('Resident does not belong to this organization');
    }

    if (voteDto.option_id && voteDto.option_ids) throw new BadRequestException('Supply option_id or option_ids, not both');
    const optionIds = voteDto.option_ids ?? (voteDto.option_id ? [voteDto.option_id] : []);
    if (!optionIds.length || optionIds.length > 100 || new Set(optionIds).size !== optionIds.length) {
      throw new BadRequestException('Select 1 to 100 distinct poll options');
    }
    const saved = await this.dataSource.transaction(async manager => {
      // Serializes ballot submissions, including retries, before checking for an existing ballot.
      const poll = await manager.getRepository(Poll).findOne({
        where: { id: voteDto.poll_id, organization_id: orgId }, lock: { mode: 'pessimistic_write' },
      });
      if (!poll) throw new ForbiddenException('Poll not found');
      const voteRepo = manager.getRepository(PollVote);
      const existing = await voteRepo.findOne({ where: { poll_id: poll.id, resident_id: resident.id } });
      if (existing) throw new ForbiddenException('Resident has already voted in this poll');
      if (poll.status !== 'PUBLISHED') throw new ForbiddenException('Voting is only allowed on published polls');
      const now = new Date();
      if (now < new Date(poll.starts_at)) throw new ForbiddenException('Poll has not started yet');
      if (now > new Date(poll.ends_at)) throw new ForbiddenException('Poll has ended');
      if (poll.poll_type !== 'MULTIPLE' && optionIds.length !== 1) throw new BadRequestException('Select exactly one option for a single-choice poll');
      for (const optionId of optionIds) {
        const option = await manager.getRepository(PollOption).findOne({ where: { id: optionId, poll_id: poll.id } });
        if (!option) throw new ForbiddenException('Invalid poll option');
        if (option.organization_id !== poll.organization_id) throw new ForbiddenException('Poll option does not belong to this poll\'s organization');
      }
      const votes: PollVote[] = [];
      for (const optionId of optionIds) {
        votes.push(await voteRepo.save(voteRepo.create({
          id: randomUUID(), poll_id: poll.id, option_id: optionId, resident_id: resident.id,
          organization_id: orgId, created_at: now,
        })));
      }
      return votes;
    });
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: orgId,
      }),
      action: AuditAction.VOTE,
      entity_type: AuditEntityType.POLL,
      entity_id: voteDto.poll_id,
      old_values: null,
      new_values: toSnapshot(voteDto.option_ids ? { poll_id: voteDto.poll_id, option_ids: optionIds } : saved[0]),
      ...extractRequestMeta(undefined),
    } as never);
    return voteDto.option_ids ? saved : saved[0];
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
      .find({ where: { poll_id: pollId, organization_id: orgId }, order: { display_order: 'ASC', id: 'ASC' } });

    return options.map(option => ({
      id: option.id,
      option_text: option.option_text,
      display_order: option.display_order,
      vote_count: optionCounts[option.id] || 0,
    }));
  }
}
