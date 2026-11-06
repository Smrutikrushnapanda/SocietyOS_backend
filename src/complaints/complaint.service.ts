import { ResidentPageDto, residentPage } from '../common/resident-page';
import { BadRequestException as FeedBadRequestException } from '@nestjs/common';
import { BusinessNotificationEvents } from '../notifications/delivery/business-notification-events';
import { NotificationCategory } from '../notifications/notification-preferences.policy';
import {
  Injectable,
  Optional,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { randomUUID } from 'crypto';
import { Complaint } from '../database/entities/complaint.entity';
import { ComplaintStatusHistory } from '../database/entities/complaint-status-history.entity';
import { ComplaintPriorityConfig } from '../database/entities/complaint-priority-config.entity';
import { Notification } from '../database/entities/notification.entity';
import { UserRole } from '../database/entities/user-role.entity';
import { Flat } from '../database/entities/flat.entity';
import { Resident } from '../database/entities/resident.entity';
import { CreateComplaintDto } from './dto';
import { UpdateComplaintDto } from './dto';
import {
  CreatePriorityConfigDto,
  UpdatePriorityConfigDto,
} from './dto/priority.dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/audit.enums';
import {
  AuditCallContext,
  AuditOrganizationContextLike,
  extractRequestMeta,
  recordAudit,
  resolveAuditContext,
  toSnapshot,
} from '../audit/audit-context';

type ComplaintContext = AuditOrganizationContextLike & { actorUserId?: string };
import { WhatsAppEventsService } from '../whatsapp/whatsapp-events.service';

@Injectable()
export class ComplaintService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    @Optional()
    private readonly notificationEvents?: BusinessNotificationEvents,
    @Optional() private readonly whatsappEvents?: WhatsAppEventsService,
  ) {}

  private buildAuditOptions(
    passed?: AuditCallContext,
    entityOrganizationId?: string | null,
    actorUserId?: string | null,
  ): AuditCallContext {
    return {
      orgContext: passed?.orgContext ?? null,
      actorUserId: passed?.actorUserId ?? actorUserId ?? null,
      entityOrganizationId:
        passed?.entityOrganizationId ?? entityOrganizationId ?? null,
      request: passed?.request,
    };
  }

  private emitAudit(
    action: AuditAction,
    entityType: AuditEntityType,
    entityId: string | null,
    oldValues: Record<string, unknown> | null,
    newValues: Record<string, unknown> | null,
    options?: AuditCallContext,
  ): void {
    const opts = this.buildAuditOptions(
      options,
      (typeof newValues?.organization_id === 'string'
        ? newValues.organization_id
        : null) ??
        (typeof oldValues?.organization_id === 'string'
          ? oldValues.organization_id
          : null) ??
        options?.entityOrganizationId ??
        null,
      options?.actorUserId ?? null,
    );
    const ctx = resolveAuditContext({
      orgContext: opts.orgContext,
      actorUserId: opts.actorUserId ?? undefined,
      entityOrganizationId: opts.entityOrganizationId ?? undefined,
    });
    const meta = extractRequestMeta(opts.request);
    void recordAudit(this.auditService, {
      ...ctx,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_values: oldValues,
      new_values: newValues,
      ...meta,
    } as never);
  }

  async findMyPage(userId: string, context: any, query: ResidentPageDto) {
    if (!['all', 'active', 'completed', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED'].includes(query.tab ?? 'all')) throw new FeedBadRequestException('Invalid helpdesk tab');
    return residentPage(this.dataSource, Complaint, userId, context, query, 'resident_id', 'created_at', qb => {
      if (query.tab === 'active') qb.andWhere('record.status IN (:...statuses)', { statuses: ['OPEN', 'IN_PROGRESS'] });
      else if (query.tab === 'completed') qb.andWhere('record.status IN (:...statuses)', { statuses: ['RESOLVED', 'CLOSED', 'REJECTED'] });
      else if (query.tab && query.tab !== 'all') qb.andWhere('record.status = :status', { status: query.tab });
    });
  }

  async actionableCount(
    orgContext: ComplaintContext,
  ): Promise<{ count: number }> {
    const organizationId =
      orgContext?.targetOrganizationId ??
      orgContext?.organizationId ??
      orgContext?.organization_id;
    if (!organizationId)
      throw new ForbiddenException('Organization context is required');
    const count = await this.dataSource.getRepository(Complaint).count({
      where: {
        organization_id: organizationId,
        status: In(['OPEN', 'IN_PROGRESS']),
      },
    });
    return { count };
  }

  async create(
    createDto: CreateComplaintDto,
    authenticatedUserIdOrResidentId: string,
    orgContext: ComplaintContext,
  ): Promise<Complaint> {
    const orgId =
      orgContext?.targetOrganizationId ??
      orgContext?.organizationId ??
      orgContext?.organization_id;
    if (!orgId) {
      throw new ForbiddenException('Organization context is required');
    }

    // Server-side Resident resolution: req.user.id -> Resident.user_id -> Resident.id
    // Check if authenticated identifier is a User holding a Resident record in this organization
    const residentRepo = this.dataSource.getRepository(Resident);
    const resident =
      typeof residentRepo?.findOne === 'function'
        ? await residentRepo.findOne({
            where: [
              {
                user_id: authenticatedUserIdOrResidentId,
                organization_id: orgId,
              },
              { id: authenticatedUserIdOrResidentId, organization_id: orgId },
            ],
          })
        : null;

    let resolvedResidentId: string;
    if (resident) {
      if (
        createDto.resident_id &&
        createDto.resident_id !== resident.id &&
        createDto.resident_id !== resident.user_id
      ) {
        throw new ForbiddenException(
          'Residents can only create complaints for themselves',
        );
      }
      resolvedResidentId = resident.id;
    } else {
      if (createDto.resident_id) {
        if (createDto.resident_id !== authenticatedUserIdOrResidentId) {
          throw new ForbiddenException(
            'Residents can only create complaints for themselves',
          );
        }
        resolvedResidentId = createDto.resident_id;
      } else {
        resolvedResidentId = authenticatedUserIdOrResidentId;
      }
    }

    let resolvedFlatId = resident?.flat_id;
    if (createDto.flat_id) {
      if (
        resident &&
        resident.flat_id &&
        createDto.flat_id !== resident.flat_id
      ) {
        throw new ForbiddenException(
          'Residents can only create complaints for their own flat',
        );
      }
      const flatRepo =
        typeof this.dataSource?.getRepository === 'function'
          ? this.dataSource.getRepository(Flat)
          : null;
      if (flatRepo && typeof flatRepo.findOneBy === 'function') {
        const flat = await flatRepo.findOneBy({
          id: createDto.flat_id,
          organization_id: orgId,
        });
        if (!flat) {
          throw new ForbiddenException('Flat not found or access denied');
        }
      }
      resolvedFlatId = createDto.flat_id;
    }

    const complaint: Complaint = this.dataSource
      .getRepository(Complaint)
      .create({
        id: randomUUID(),
        organization_id: orgId,
        resident_id: resolvedResidentId,
        flat_id: resolvedFlatId,
        category: createDto.category,
        subject: createDto.subject,
        description: createDto.description,
        status: 'OPEN',
        priority: createDto.priority || 'MEDIUM',
        assigned_to: null,
        resolved_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      });
    const saved = await this.dataSource
      .getRepository(Complaint)
      .save(complaint);
    await recordAudit(this.auditService, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: saved.organization_id,
      }),
      action: AuditAction.CREATE,
      entity_type: AuditEntityType.COMPLAINT,
      entity_id: saved.id ?? null,
      old_values: null,
      new_values: toSnapshot(saved),
      ...extractRequestMeta(undefined),
    } as never);
    return saved;
  }

  async findMyComplaints(
    userId: string,
    orgContext: ComplaintContext,
  ): Promise<Complaint[]> {
    const orgId =
      orgContext?.targetOrganizationId ??
      orgContext?.organizationId ??
      orgContext?.organization_id;
    if (!orgId) {
      throw new ForbiddenException('Organization context is required');
    }

    const resident = await this.dataSource.getRepository(Resident).findOne({
      where: [
        { user_id: userId, organization_id: orgId },
        { id: userId, organization_id: orgId },
      ],
    });

    if (!resident) {
      throw new NotFoundException(
        'Resident record not found in this organization',
      );
    }

    return this.dataSource.getRepository(Complaint).find({
      where: {
        organization_id: orgId,
        resident_id: resident.id,
      },
      order: {
        created_at: 'DESC',
      },
    });
  }

  async findAll(orgContext: ComplaintContext): Promise<Complaint[]> {
    const orgId = this.organizationId(orgContext);
    return this.dataSource
      .getRepository(Complaint)
      .find({ where: { organization_id: orgId } });
  }

  async findOne(
    id: string,
    orgContext: ComplaintContext,
  ): Promise<Complaint | null> {
    const orgId = this.organizationId(orgContext);
    return this.dataSource
      .getRepository(Complaint)
      .findOne({ where: { id, organization_id: orgId } });
  }

  async residentHistory(id: string, userId: string, context: ComplaintContext) {
    const orgId = this.organizationId(context);
    const resident = await this.dataSource
      .getRepository(Resident)
      .findOneBy({ user_id: userId, organization_id: orgId });
    if (!resident) throw new NotFoundException('Request not found');
    const complaint = await this.dataSource
      .getRepository(Complaint)
      .findOneBy({ id, resident_id: resident.id, organization_id: orgId });
    if (!complaint) throw new NotFoundException('Request not found');
    const history = await this.dataSource
      .getRepository(ComplaintStatusHistory)
      .find({
        where: { complaint_id: id },
        order: { changed_at: 'ASC', id: 'ASC' },
      });
    // Legacy reasons may contain internal notes; expose only transition facts.
    return {
      complaint,
      history: history.map((item) => ({
        id: item.id,
        previous_status: item.previous_status,
        new_status: item.new_status,
        changed_at: item.changed_at,
      })),
    };
  }

  private organizationId(context: ComplaintContext): string {
    const organizationId = context?.organizationId;
    if (!organizationId)
      throw new ForbiddenException('Organization context is required');
    return organizationId;
  }

  private async change(
    id: string,
    dto: UpdateComplaintDto,
    context: ComplaintContext,
    reason: string | null = null,
  ) {
    const organizationId = this.organizationId(context);
    const actorUserId = context.actorUserId ?? context.userId;
    if (!actorUserId)
      throw new ForbiddenException('Authenticated actor is required');
    const change = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Complaint);
      const complaint = await repo.findOne({
        where: { id, organization_id: organizationId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!complaint) return null;
      const oldValues = toSnapshot(complaint);
      const previous = complaint.status;
      if (dto.status) {
        const transitions: Record<string, string[]> = {
          OPEN: ['IN_PROGRESS', 'REJECTED'],
          IN_PROGRESS: ['RESOLVED', 'REJECTED'],
          RESOLVED: ['CLOSED'],
        };
        if (!transitions[previous]?.includes(dto.status))
          throw new ForbiddenException(
            `Invalid transition from ${previous} to ${dto.status}`,
          );
        complaint.status = dto.status;
        if (dto.status === 'RESOLVED') complaint.resolved_at = new Date();
        await manager.getRepository(ComplaintStatusHistory).save({
          id: randomUUID(),
          complaint_id: id,
          previous_status: previous,
          new_status: dto.status,
          changed_by: actorUserId,
          changed_at: new Date(),
          reason,
        });
      }
      if (dto.assigned_to) {
        const membership = await manager.getRepository(UserRole).findOne({
          where: { userId: dto.assigned_to, organization_id: organizationId },
          relations: { role: true },
        });
        if (
          !membership ||
          !membership.role?.isActive ||
          !['SOCIETY_ADMIN', 'GUARD'].includes(membership.role.name)
        )
          throw new BadRequestException(
            'Assignee must be authorized staff in this organization',
          );
        complaint.assigned_to = dto.assigned_to;
      }
      if (dto.priority) complaint.priority = dto.priority;
      complaint.updated_at = new Date();
      const saved = await repo.save(complaint);
      if (
        dto.status ||
        (dto.assigned_to && dto.assigned_to !== oldValues?.assigned_to)
      ) {
        const resident = await manager.getRepository(Resident).findOneBy({
          id: complaint.resident_id,
          organization_id: organizationId,
        });
        if (resident) {
          const notificationId = randomUUID();
          await manager.getRepository(Notification).save({
            id: notificationId,
            organization_id: organizationId,
            recipient_user_id: resident.user_id,
            type: 'MAINTENANCE',
            title: complaint.subject,
            body: dto.status
              ? `Request status: ${complaint.status}`
              : 'Responsible staff assigned',
            data: { complaintId: id, status: complaint.status },
            is_read: false,
            read_at: null,
            created_at: new Date(),
            updated_at: new Date(),
          });
          await this.notificationEvents?.resident(
            manager,
            organizationId,
            complaint.resident_id,
            NotificationCategory.COMPLAINT,
            complaint.id,
            `complaint:${complaint.id}:${notificationId}`,
          );
        }
      }
      return { saved, oldValues };
    });
    if (change && (dto.status || (dto.assigned_to && dto.assigned_to !== change.oldValues?.assigned_to))) {
      void this.whatsappEvents?.resident(organizationId, change.saved.resident_id, 'COMPLAINT',
        `*Complaint update*\n\n${change.saved.subject}\n${dto.status ? `Status: ${change.saved.status}` : 'Responsible staff assigned'}\nOpen SocietyOS for details.`);
    }
    return change;
  }

  async update(
    id: string,
    dto: UpdateComplaintDto,
    context: ComplaintContext,
  ): Promise<Complaint | null> {
    const change = await this.change(id, dto, context);
    if (!change) return null;
    await recordAudit(this.auditService, {
      ...resolveAuditContext({
        orgContext: context,
        actorUserId: context.actorUserId,
      }),
      action: AuditAction.UPDATE,
      entity_type: AuditEntityType.COMPLAINT,
      entity_id: id,
      old_values: change.oldValues,
      new_values: toSnapshot(change.saved),
    } as never);
    return change.saved;
  }

  async assign(
    id: string,
    assignedTo: string,
    context: ComplaintContext,
  ): Promise<Complaint | null> {
    const change = await this.change(id, { assigned_to: assignedTo }, context);
    if (!change) return null;
    await recordAudit(this.auditService, {
      ...resolveAuditContext({
        orgContext: context,
        actorUserId: context.actorUserId,
      }),
      action: AuditAction.ASSIGN,
      entity_type: AuditEntityType.COMPLAINT,
      entity_id: id,
      old_values: change.oldValues,
      new_values: toSnapshot(change.saved),
    } as never);
    return change.saved;
  }

  async resolve(
    id: string,
    reason: string,
    context: ComplaintContext,
  ): Promise<Complaint | null> {
    if (
      reason != null &&
      (typeof reason !== 'string' || reason.length > 2000)
    ) {
      throw new BadRequestException(
        'Resolution reason must be a string of at most 2000 characters',
      );
    }
    const change = await this.change(
      id,
      { status: 'RESOLVED' },
      context,
      reason?.trim() || null,
    );
    if (!change) return null;
    await recordAudit(this.auditService, {
      ...resolveAuditContext({
        orgContext: context,
        actorUserId: context.actorUserId,
      }),
      action: AuditAction.RESOLVE,
      entity_type: AuditEntityType.COMPLAINT,
      entity_id: id,
      old_values: change.oldValues,
      new_values: toSnapshot(change.saved),
    } as never);
    return change.saved;
  }

  async findAllPriorities(
    orgContext: ComplaintContext,
  ): Promise<ComplaintPriorityConfig[]> {
    const orgId =
      orgContext?.targetOrganizationId ??
      orgContext?.organizationId ??
      orgContext?.organization_id;
    if (!orgId) {
      throw new ForbiddenException('Organization context is required');
    }

    const repo = this.dataSource.getRepository(ComplaintPriorityConfig);
    let items = await repo.find({
      where: { organization_id: orgId },
      order: { order_severity: 'ASC' },
    });

    if (items.length === 0) {
      // Seed default priority tiers for this organization
      const defaults = [
        {
          id: randomUUID(),
          organization_id: orgId,
          priority: 'URGENT',
          name: 'Urgent (P1)',
          description: 'Emergency safety and major infrastructure issues',
          order_severity: 1,
          response_deadline_minutes: 15,
          resolution_deadline_minutes: 240,
          escalation_window_minutes: 120,
          escalation_recipient: 'Estate Manager + Chairman',
          status: 'Active',
        },
        {
          id: randomUUID(),
          organization_id: orgId,
          priority: 'HIGH',
          name: 'High (P2)',
          description: 'High impact facility, lift, or power breakdowns',
          order_severity: 2,
          response_deadline_minutes: 60,
          resolution_deadline_minutes: 720,
          escalation_window_minutes: 360,
          escalation_recipient: 'Operations Lead',
          status: 'Active',
        },
        {
          id: randomUUID(),
          organization_id: orgId,
          priority: 'MEDIUM',
          name: 'Medium (P3)',
          description: 'Standard residential plumbing and electrical issues',
          order_severity: 3,
          response_deadline_minutes: 240,
          resolution_deadline_minutes: 1440,
          escalation_window_minutes: 1080,
          escalation_recipient: 'Supervisor',
          status: 'Active',
        },
        {
          id: randomUUID(),
          organization_id: orgId,
          priority: 'LOW',
          name: 'Low (P4)',
          description: 'Minor non-disruptive aesthetics or inquiries',
          order_severity: 4,
          response_deadline_minutes: 720,
          resolution_deadline_minutes: 2880,
          escalation_window_minutes: 2160,
          escalation_recipient: 'Facility Desk',
          status: 'Active',
        },
      ];

      await repo.save(defaults);
      items = await repo.find({
        where: { organization_id: orgId },
        order: { order_severity: 'ASC' },
      });
    }

    return items;
  }

  async createPriority(
    dto: CreatePriorityConfigDto,
    orgContext: ComplaintContext,
  ): Promise<ComplaintPriorityConfig> {
    const orgId =
      orgContext?.targetOrganizationId ??
      orgContext?.organizationId ??
      orgContext?.organization_id;
    if (!orgId) {
      throw new ForbiddenException('Organization context is required');
    }

    if (dto.resolution_deadline_minutes < dto.response_deadline_minutes) {
      throw new BadRequestException(
        'Resolution deadline cannot be shorter than response deadline',
      );
    }
    if (dto.escalation_window_minutes > dto.resolution_deadline_minutes) {
      throw new BadRequestException(
        'Escalation window cannot exceed resolution deadline',
      );
    }

    const repo = this.dataSource.getRepository(ComplaintPriorityConfig);
    const existing = await repo.findOne({
      where: { organization_id: orgId, priority: dto.priority.toUpperCase() },
    });
    if (existing) {
      throw new BadRequestException(
        `Priority code '${dto.priority}' already exists for this society`,
      );
    }

    const entity = repo.create({
      id: randomUUID(),
      organization_id: orgId,
      priority: dto.priority.toUpperCase(),
      name: dto.name,
      description: dto.description || null,
      order_severity: dto.order_severity ?? 3,
      response_deadline_minutes: dto.response_deadline_minutes,
      resolution_deadline_minutes: dto.resolution_deadline_minutes,
      escalation_window_minutes: dto.escalation_window_minutes,
      escalation_recipient: dto.escalation_recipient || 'Facility Desk',
      status: dto.status || 'Active',
    });

    return repo.save(entity);
  }

  async updatePriority(
    id: string,
    dto: UpdatePriorityConfigDto,
    orgContext: ComplaintContext,
  ): Promise<ComplaintPriorityConfig> {
    const orgId =
      orgContext?.targetOrganizationId ??
      orgContext?.organizationId ??
      orgContext?.organization_id;
    if (!orgId) {
      throw new ForbiddenException('Organization context is required');
    }

    const repo = this.dataSource.getRepository(ComplaintPriorityConfig);
    const item = await repo.findOne({ where: { id, organization_id: orgId } });
    if (!item) {
      throw new NotFoundException(
        'Priority configuration not found or access denied',
      );
    }

    const newResponse =
      dto.response_deadline_minutes ?? item.response_deadline_minutes;
    const newResolution =
      dto.resolution_deadline_minutes ?? item.resolution_deadline_minutes;
    const newEscalation =
      dto.escalation_window_minutes ?? item.escalation_window_minutes;

    if (newResolution < newResponse) {
      throw new BadRequestException(
        'Resolution deadline cannot be shorter than response deadline',
      );
    }
    if (newEscalation > newResolution) {
      throw new BadRequestException(
        'Escalation window cannot exceed resolution deadline',
      );
    }

    if (dto.name !== undefined) item.name = dto.name;
    if (dto.description !== undefined) item.description = dto.description;
    if (dto.order_severity !== undefined)
      item.order_severity = dto.order_severity;
    if (dto.response_deadline_minutes !== undefined)
      item.response_deadline_minutes = dto.response_deadline_minutes;
    if (dto.resolution_deadline_minutes !== undefined)
      item.resolution_deadline_minutes = dto.resolution_deadline_minutes;
    if (dto.escalation_window_minutes !== undefined)
      item.escalation_window_minutes = dto.escalation_window_minutes;
    if (dto.escalation_recipient !== undefined)
      item.escalation_recipient = dto.escalation_recipient;
    if (dto.status !== undefined) item.status = dto.status;
    item.updated_at = new Date();

    return repo.save(item);
  }

  async deletePriority(
    id: string,
    orgContext: ComplaintContext,
  ): Promise<{ deleted: boolean }> {
    const orgId =
      orgContext?.targetOrganizationId ??
      orgContext?.organizationId ??
      orgContext?.organization_id;
    if (!orgId) {
      throw new ForbiddenException('Organization context is required');
    }

    const repo = this.dataSource.getRepository(ComplaintPriorityConfig);
    const item = await repo.findOne({ where: { id, organization_id: orgId } });
    if (!item) {
      throw new NotFoundException(
        'Priority configuration not found or access denied',
      );
    }

    await repo.remove(item);
    return { deleted: true };
  }
}
