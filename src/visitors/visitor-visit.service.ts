import { ResidentPageDto, residentPage } from '../common/resident-page';
import { BadRequestException as FeedBadRequestException } from '@nestjs/common';
import {
  VisitorLiveEvents,
  visitorStatusEvent,
} from './live/visitor-live.events';
import { BusinessNotificationEvents } from '../notifications/delivery/business-notification-events';
import { NotificationCategory } from '../notifications/notification-preferences.policy';
import {
  ConflictException,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { VisitorVisit } from '../database/entities/visitor-visit.entity';
import { Visitor } from '../database/entities/visitor.entity';
import { Resident } from '../database/entities/resident.entity';
import { Flat } from '../database/entities/flat.entity';
import { OrganizationContextService } from '../organization/organization-context.service';
import { PreApproveVisitorVisitDto } from './dto/pre-approve-visitor-visit.dto';
import { Request } from 'express';
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

import { Optional } from '@nestjs/common';
import { VisitorPassService } from './visitor-pass.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { VisitorPass } from '../database/entities/visitor-pass.entity';
import { VisitorApproval } from '../database/entities/visitor-approval.entity';
import { ResidentVisitorDecision } from './dto/decide-my-visitor-visit.dto';
import { WhatsAppEventsService } from '../whatsapp/whatsapp-events.service';

@Injectable()
export class VisitorVisitService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly organizationContextService: OrganizationContextService,
    private readonly auditService: AuditService,
    @Optional() private readonly visitorPassService?: VisitorPassService,
    @Optional() private readonly whatsAppService?: WhatsAppService,
    @Optional()
    private readonly notificationEvents?: BusinessNotificationEvents,
    @Optional() private readonly live?: VisitorLiveEvents,
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
      (newValues as any)?.organization_id ??
        (oldValues as any)?.organization_id ??
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
    if (!['all', 'active', 'requested', 'approved', 'checked-in', 'checked-out', 'denied'].includes(query.tab ?? 'all')) throw new FeedBadRequestException('Invalid visitor tab');
    return residentPage(this.dataSource, VisitorVisit, userId, context, query, 'host_resident_id', 'createdAt', qb => {
      qb.leftJoinAndSelect('record.visitor', 'visitor');
      if (query.tab === 'active') qb.andWhere('record.visit_status IN (:...statuses)', { statuses: ['PENDING', 'CONFIRMED'] });
      if (query.tab === 'requested' || query.tab === 'approved') qb.andWhere('record.visit_status = :status AND record.actual_entry_time IS NULL', { status: query.tab === 'requested' ? 'PENDING' : 'CONFIRMED' });
      if (query.tab === 'checked-in') qb.andWhere("record.actual_entry_time IS NOT NULL AND record.visit_status = 'CONFIRMED'");
      if (query.tab === 'checked-out') qb.andWhere("record.visit_status = 'COMPLETED'");
      if (query.tab === 'denied') qb.andWhere('record.visit_status IN (:...statuses)', { statuses: ['CANCELLED', 'EXPIRED'] });
    });
  }

  async createVisitorVisit(
    createVisitorVisitDto: {
      organization_id: string;
      visitor_id: string;
      visit_status: string;
      visit_purpose?: string;
      expected_entry_time?: Date;
      host_resident_id?: string;
    },
    passedOrgContext?: any,
  ) {
    const orgContext =
      passedOrgContext ??
      (await this.organizationContextService.getCurrentOrganization({} as any));

    // Phase 11 Step 2: the authoritative organization always comes from the
    // guard-resolved context. A client-supplied organization_id never grants
    // authorization and must match the context when present.
    const targetOrganizationId = orgContext.isSuperAdmin
      ? orgContext.targetOrganizationId
      : orgContext.organization_id;
    if (!targetOrganizationId) {
      throw new ForbiddenException('Organization context is required');
    }
    if (
      createVisitorVisitDto.organization_id &&
      createVisitorVisitDto.organization_id !== targetOrganizationId
    ) {
      throw new ForbiddenException(
        'You can only create visitor visits in your organization',
      );
    }

    // Validate visitor belongs to the target organization
    const visitorRepository = this.dataSource.getRepository(Visitor);
    const visitor = await visitorRepository.findOneBy({
      id: createVisitorVisitDto.visitor_id,
      organization_id: targetOrganizationId,
    });

    if (!visitor) {
      throw new ForbiddenException('Visitor not found or access denied');
    }

    // Validate host resident belongs to the target organization if provided
    if (createVisitorVisitDto.host_resident_id) {
      const resident = await this.dataSource.getRepository(Resident).findOneBy({
        id: createVisitorVisitDto.host_resident_id,
        organization_id: targetOrganizationId,
      });
      if (!resident) {
        throw new ForbiddenException(
          'Host resident not found or access denied',
        );
      }
    }

    // Validate visit status
    const validStatuses = [
      'PENDING',
      'CONFIRMED',
      'COMPLETED',
      'CANCELLED',
      'EXPIRED',
    ];
    if (!validStatuses.includes(createVisitorVisitDto.visit_status)) {
      throw new ForbiddenException('Invalid visit status');
    }

    const expectedEntryTime = createVisitorVisitDto.expected_entry_time
      ? new Date(createVisitorVisitDto.expected_entry_time)
      : undefined;

    const visitorVisit = this.dataSource.getRepository(VisitorVisit).create({
      id: randomUUID(),
      organization_id: targetOrganizationId,
      visitor_id: createVisitorVisitDto.visitor_id,
      host_resident_id: createVisitorVisitDto.host_resident_id,
      visit_status: createVisitorVisitDto.visit_status as
        'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED',
      visit_purpose: createVisitorVisitDto.visit_purpose,
      expected_entry_time: expectedEntryTime,
    } as Partial<VisitorVisit>);

    await this.dataSource.getRepository(VisitorVisit).save(visitorVisit);
    this.live?.publish(visitorVisit, 'visit.created');
    await recordAudit(this.auditService, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (visitorVisit as any).organization_id,
      }),
      action: AuditAction.CREATE,
      entity_type: AuditEntityType.VISITOR_VISIT,
      entity_id: (visitorVisit as any).id ?? null,
      old_values: null,
      new_values: toSnapshot(visitorVisit),
      ...extractRequestMeta(undefined),
    } as never);
    return visitorVisit;
  }

  async findAll(passedOrgContext?: any) {
    const orgContext =
      passedOrgContext ??
      (await this.organizationContextService.getCurrentOrganization({} as any));

    const query = this.dataSource
      .getRepository(VisitorVisit)
      .createQueryBuilder('visitor_visit');

    const organizationId = orgContext.isSuperAdmin
      ? orgContext.targetOrganizationId
      : orgContext.organization_id;
    if (!organizationId)
      throw new ForbiddenException('Organization context is required');
    query.where('visitor_visit.organization_id = :orgId', {
      orgId: organizationId,
    });

    return query.getMany();
  }

  async findOne(id: string, passedOrgContext?: any) {
    const orgContext =
      passedOrgContext ??
      (await this.organizationContextService.getCurrentOrganization({} as any));

    const visitorVisit = await this.dataSource
      .getRepository(VisitorVisit)
      .findOneBy({
        id,
        organization_id:
          orgContext.isSuperAdmin && orgContext.targetOrganizationId
            ? orgContext.targetOrganizationId
            : orgContext.organization_id,
      });

    if (!visitorVisit) {
      throw new ForbiddenException('Visitor visit not found or access denied');
    }
    return visitorVisit;
  }

  async update(
    id: string,
    updateVisitorVisitDto: {
      visit_status?: string;
      visit_purpose?: string;
      expected_entry_time?: Date;
      check_in?: boolean;
      organization_id?: string;
    },
    passedOrgContext?: any,
  ) {
    const orgContext: AuditOrganizationContextLike =
      passedOrgContext ??
      (await this.organizationContextService.getCurrentOrganization({} as any));
    const organizationId = orgContext.isSuperAdmin
      ? orgContext.targetOrganizationId
      : (orgContext.organization_id ?? orgContext.organizationId);
    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }

    const { saved, oldValues } = await this.dataSource.transaction(
      async (manager) => {
        const repository = manager.getRepository(VisitorVisit);
        const visitorVisit = await repository.findOne({
          where: { id, organization_id: organizationId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!visitorVisit || visitorVisit.organization_id !== organizationId) {
          throw new ForbiddenException(
            'Visitor visit not found or access denied',
          );
        }

        const oldValues = toSnapshot(visitorVisit);
        if (updateVisitorVisitDto.check_in) {
          if (
            ['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(
              visitorVisit.visit_status,
            )
          ) {
            throw new ForbiddenException('Cannot check in a closed visit');
          }
          if (
            updateVisitorVisitDto.visit_status &&
            updateVisitorVisitDto.visit_status !== 'CONFIRMED'
          ) {
            throw new ForbiddenException('Invalid check-in status');
          }
          visitorVisit.actual_entry_time =
            visitorVisit.actual_entry_time || new Date();
          visitorVisit.visit_status = 'CONFIRMED';
        }
        if (updateVisitorVisitDto.visit_status) {
          const validStatuses = [
            'PENDING',
            'CONFIRMED',
            'COMPLETED',
            'CANCELLED',
            'EXPIRED',
          ];
          if (!validStatuses.includes(updateVisitorVisitDto.visit_status)) {
            throw new ForbiddenException('Invalid visit status');
          }
          visitorVisit.visit_status = updateVisitorVisitDto.visit_status as
            'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
        }
        if (updateVisitorVisitDto.visit_purpose) {
          visitorVisit.visit_purpose = updateVisitorVisitDto.visit_purpose;
        }
        if (updateVisitorVisitDto.expected_entry_time) {
          visitorVisit.expected_entry_time =
            updateVisitorVisitDto.expected_entry_time
              ? new Date(updateVisitorVisitDto.expected_entry_time)
              : null;
        }

        const saved = await repository.save(visitorVisit);
        if (updateVisitorVisitDto.check_in) {
          await this.notificationEvents?.resident(
            manager,
            saved.organization_id,
            saved.host_resident_id,
            NotificationCategory.VISITOR_ARRIVAL,
            saved.id,
            `visit:${saved.id}:arrival`,
          );
        }
        return { saved, oldValues };
      },
    );

    if (updateVisitorVisitDto.check_in && !oldValues?.actual_entry_time) {
      this.live?.publish(saved, 'visit.arrived');
      void this.whatsappEvents?.resident(saved.organization_id, saved.host_resident_id, 'VISITOR_ARRIVAL',
        '*Visitor arrival*\n\nYour visitor has checked in at the security gate. Open SocietyOS Visitors for details.', { key: 'visitorArrival', visitorId: saved.visitor_id, variables: { visitor_name: 'Your visitor', gate_name: 'Security gate' } });
    } else if (oldValues?.visit_status !== saved.visit_status) {
      this.live?.publish(saved, visitorStatusEvent(saved.visit_status));
    } else if (
      updateVisitorVisitDto.visit_purpose !== undefined ||
      updateVisitorVisitDto.expected_entry_time !== undefined
    ) {
      this.live?.publish(saved, 'visit.status_changed');
    }
    await recordAudit(this.auditService, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: saved.organization_id,
      }),
      action: AuditAction.UPDATE,
      entity_type: AuditEntityType.VISITOR_VISIT,
      entity_id: saved.id,
      old_values: oldValues,
      new_values: toSnapshot(saved),
      ...extractRequestMeta(undefined),
    } as never);
    return saved;
  }

  async remove(id: string, passedOrgContext?: any) {
    const orgContext =
      passedOrgContext ??
      (await this.organizationContextService.getCurrentOrganization({} as any));

    const visitorVisit = await this.dataSource
      .getRepository(VisitorVisit)
      .findOneBy({
        id,
        organization_id:
          orgContext.isSuperAdmin && orgContext.targetOrganizationId
            ? orgContext.targetOrganizationId
            : orgContext.organization_id,
      });

    if (!visitorVisit) {
      throw new ForbiddenException('Visitor visit not found or access denied');
    }

    if (!orgContext.isSuperAdmin) {
      if (visitorVisit.organization_id !== orgContext.organization_id) {
        throw new ForbiddenException(
          'You can only cancel visitor visits in your organization',
        );
      }
    }

    const oldValues = toSnapshot(visitorVisit);
    visitorVisit.visit_status = 'CANCELLED' as const;
    await this.dataSource.getRepository(VisitorVisit).save(visitorVisit);
    this.live?.publish(visitorVisit, 'visit.rejected');
    await recordAudit(this.auditService, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (visitorVisit as any).organization_id,
      }),
      action: AuditAction.CANCEL,
      entity_type: AuditEntityType.VISITOR_VISIT,
      entity_id: (visitorVisit as any).id ?? null,
      old_values: oldValues,
      new_values: null,
      ...extractRequestMeta(undefined),
    } as never);
    return visitorVisit;
  }

  async findMyVisits(userId: string, passedOrgContext?: any) {
    const orgContext =
      passedOrgContext ??
      (await this.organizationContextService.getCurrentOrganization({} as any));

    const organizationId =
      orgContext.targetOrganizationId ??
      orgContext.organizationId ??
      orgContext.organization_id;

    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }

    const resident = await this.dataSource.getRepository(Resident).findOneBy({
      user_id: userId,
      organization_id: organizationId,
    });

    if (!resident) {
      throw new NotFoundException('Resident record not found');
    }

    const repo = this.dataSource.getRepository(VisitorVisit);
    if (typeof repo.createQueryBuilder === 'function') {
      const qb = repo.createQueryBuilder('visit');
      if (typeof qb.leftJoinAndSelect === 'function') {
        qb.leftJoinAndSelect('visit.visitor', 'visitor');
      }
      return qb
        .where('visit.organization_id = :orgId', { orgId: organizationId })
        .andWhere('visit.host_resident_id = :residentId', {
          residentId: resident.id,
        })
        .orderBy('visit.createdAt', 'DESC')
        .getMany();
    }

    return repo.findBy({
      organization_id: organizationId,
      host_resident_id: resident.id,
    });
  }

  async decideMyVisit(
    id: string,
    decision: ResidentVisitorDecision,
    userId: string,
    passedOrgContext?: any,
  ) {
    const orgContext =
      passedOrgContext ??
      (await this.organizationContextService.getCurrentOrganization({} as any));
    const organizationId =
      orgContext.targetOrganizationId ??
      orgContext.organizationId ??
      orgContext.organization_id;
    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }

    const resident = await this.dataSource.getRepository(Resident).findOneBy({
      user_id: userId,
      organization_id: organizationId,
    });
    if (!resident) {
      throw new NotFoundException('Visitor visit not found');
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const visitRepository = manager.getRepository(VisitorVisit);
      const visit = await visitRepository.findOne({
        where: {
          id,
          organization_id: organizationId,
          host_resident_id: resident.id,
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (!visit) {
        throw new NotFoundException('Visitor visit not found');
      }
      if (visit.visit_status !== 'PENDING') {
        throw new ConflictException('Visitor visit is no longer pending');
      }

      const approvalRepository = manager.getRepository(VisitorApproval);
      let approval = await approvalRepository.findOne({
        where: {
          organization_id: organizationId,
          visitor_visit_id: visit.id,
        },
      });
      if (approval && approval.approval_status !== 'PENDING') {
        throw new ConflictException('Visitor visit already has a decision');
      }

      const now = new Date();
      const oldApproval = toSnapshot(approval);
      visit.visit_status =
        decision === ResidentVisitorDecision.APPROVED
          ? 'CONFIRMED'
          : 'CANCELLED';
      visit.updatedAt = now;
      const savedVisit = await visitRepository.save(visit);

      approval ??= approvalRepository.create({
        id: randomUUID(),
        organization_id: organizationId,
        visitor_visit_id: visit.id,
      });
      approval.approver_id = userId;
      approval.approval_status = decision;
      approval.approved_at =
        decision === ResidentVisitorDecision.APPROVED ? now : null;
      approval.rejected_at =
        decision === ResidentVisitorDecision.REJECTED ? now : null;
      approval.updatedAt = now;
      const savedApproval = await approvalRepository.save(approval);
      await this.notificationEvents?.resident(
        manager,
        visit.organization_id,
        visit.host_resident_id,
        NotificationCategory.VISITOR_APPROVAL,
        visit.id,
        `visit:${visit.id}:decision`,
      );

      return {
        savedVisit,
        savedApproval,
        oldApproval,
      };
    });
    this.live?.publish(
      result.savedVisit,
      visitorStatusEvent(result.savedVisit.visit_status),
    );
    await recordAudit(this.auditService, {
      ...resolveAuditContext({ orgContext, actorUserId: userId }),
      action:
        decision === ResidentVisitorDecision.REJECTED
          ? AuditAction.REJECT
          : AuditAction.UPDATE,
      entity_type: AuditEntityType.VISITOR_APPROVAL,
      entity_id: result.savedApproval.id,
      old_values: result.oldApproval,
      new_values: toSnapshot(result.savedApproval),
      ...extractRequestMeta(undefined),
    } as never);
    return result.savedVisit;
  }

  async preApproveVisit(
    dto: PreApproveVisitorVisitDto,
    userId: string,
    passedOrgContext?: any,
  ) {
    const orgContext =
      passedOrgContext ??
      (await this.organizationContextService.getCurrentOrganization({} as any));

    const organizationId =
      orgContext.targetOrganizationId ??
      orgContext.organizationId ??
      orgContext.organization_id;

    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }

    const resident = await this.dataSource.getRepository(Resident).findOneBy({
      user_id: userId,
      organization_id: organizationId,
    });

    if (!resident) {
      throw new NotFoundException('Resident record not found');
    }

    let visitor: Visitor | null = null;
    if (dto.visitor_id) {
      visitor = await this.dataSource.getRepository(Visitor).findOneBy({
        id: dto.visitor_id,
        organization_id: organizationId,
      });
      if (!visitor) {
        throw new NotFoundException('Visitor not found in this organization');
      }
    } else {
      visitor = await this.dataSource.getRepository(Visitor).findOneBy({
        organization_id: organizationId,
        mobile: dto.mobile,
      });
      if (!visitor) {
        visitor = this.dataSource.getRepository(Visitor).create({
          id: randomUUID(),
          organization_id: organizationId,
          name: dto.name,
          mobile: dto.mobile,
          active: true,
        });
        await this.dataSource.getRepository(Visitor).save(visitor);
      }
    }

    const expectedEntryTime = dto.expected_entry_time
      ? new Date(dto.expected_entry_time)
      : undefined;

    const visitorVisit = this.dataSource.getRepository(VisitorVisit).create({
      id: randomUUID(),
      organization_id: organizationId,
      visitor_id: visitor.id,
      host_resident_id: resident.id,
      visit_status: 'CONFIRMED',
      visit_purpose: dto.visit_purpose || 'Guest Visit',
      expected_entry_time: expectedEntryTime,
    } as Partial<VisitorVisit>);

    await this.dataSource.getRepository(VisitorVisit).save(visitorVisit);
    this.live?.publish(visitorVisit, 'visit.created');
    await recordAudit(this.auditService, {
      ...resolveAuditContext({
        orgContext,
        actorUserId: userId,
        entityOrganizationId: (visitorVisit as any).organization_id,
      }),
      action: AuditAction.CREATE,
      entity_type: AuditEntityType.VISITOR_VISIT,
      entity_id: (visitorVisit as any).id ?? null,
      old_values: null,
      new_values: toSnapshot(visitorVisit),
      ...extractRequestMeta(undefined),
    } as never);

    // Auto-generate or ensure active digital pass for this approved visit
    if (this.visitorPassService) {
      try {
        await this.visitorPassService.ensureVisitorPassForVisit(
          visitorVisit.id,
          orgContext,
          dto.name || 'Resident',
        );
      } catch {
        // Log or safely ignore pass generation failure during visit save
      }
    }

    // Auto-send WhatsApp ticket just like login OTP
    try {
      await this.sendVisitPassWhatsApp(visitorVisit.id, userId, orgContext);
    } catch {
      // Non-blocking: continue even if WhatsApp delivery is queued or session needs scanning
    }

    return visitorVisit;
  }

  async getVisitPass(visitId: string, userId: string, passedOrgContext?: any) {
    const orgContext =
      passedOrgContext ??
      (await this.organizationContextService.getCurrentOrganization({} as any));

    const organizationId =
      orgContext.targetOrganizationId ??
      orgContext.organizationId ??
      orgContext.organization_id;

    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }

    const resRepo = this.dataSource.getRepository(Resident);
    let resident: Resident | null = null;
    if (typeof resRepo.findOne === 'function') {
      try {
        resident = await resRepo.findOne({
          where: { user_id: userId, organization_id: organizationId },
          relations: { flat: true },
        });
      } catch {
        resident = await resRepo.findOneBy({
          user_id: userId,
          organization_id: organizationId,
        });
      }
    } else {
      resident = await resRepo.findOneBy({
        user_id: userId,
        organization_id: organizationId,
      });
    }

    if (!resident) {
      throw new NotFoundException('Resident record not found');
    }

    // If flat relation wasn't loaded, try fetching from Flat repository if flat_id exists
    if (!resident.flat && resident.flat_id) {
      try {
        const flatRepo = this.dataSource.getRepository(Flat);
        if (flatRepo) {
          const flatObj =
            typeof flatRepo.findOneBy === 'function'
              ? await flatRepo.findOneBy({
                  id: resident.flat_id,
                  organization_id: organizationId,
                })
              : null;
          if (flatObj) {
            (resident as any).flat = flatObj;
          }
        }
      } catch {}
    }

    const visit = await this.dataSource.getRepository(VisitorVisit).findOne({
      where: {
        id: visitId,
        organization_id: organizationId,
      },
      relations: { visitor: true, host_resident: true },
    });

    if (!visit) {
      throw new NotFoundException('Visitor visit not found');
    }

    if (visit.host_resident_id !== resident.id) {
      throw new ForbiddenException(
        'You can only view passes for your own visitor visits',
      );
    }

    if (
      visit.visit_status !== 'CONFIRMED' &&
      visit.visit_status !== 'PENDING'
    ) {
      throw new ForbiddenException(
        `Digital pass is not available for visit with status ${visit.visit_status}`,
      );
    }

    let pass: VisitorPass | null = null;
    if (this.visitorPassService) {
      pass = await this.visitorPassService.ensureVisitorPassForVisit(
        visit.id,
        orgContext,
        resident.name || 'Resident',
      );
    } else {
      const passRepo = this.dataSource.getRepository(VisitorPass);
      pass = await passRepo.findOne({
        where: {
          visitor_visit_id: visit.id,
          organization_id: organizationId,
        },
      });
      if (!pass) {
        const start = visit.expected_entry_time
          ? new Date(visit.expected_entry_time)
          : new Date();
        const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
        pass = passRepo.create({
          id: randomUUID(),
          organization_id: organizationId,
          visitor_id: visit.visitor_id,
          visitor_visit_id: visit.id,
          issuer: resident.name || 'Resident',
          pass_status: 'ACTIVE',
          validity_start: start,
          validity_end: end,
        } as Partial<VisitorPass>);
        await passRepo.save(pass);
      }
    }

    const passCode = pass.id.slice(0, 8).toUpperCase();
    const qrToken = `SOC-PASS-${passCode}`;
    const flatIdentifier =
      resident.flat?.flat_identifier ||
      (resident.flat_id ? `Flat #${resident.flat_id}` : 'your registered flat');

    return {
      passId: pass.id,
      passCode,
      qrToken,
      passStatus: pass.pass_status,
      validityStart: pass.validity_start,
      validityEnd: pass.validity_end,
      visitId: visit.id,
      visitorName: visit.visitor?.name || 'Visitor',
      visitorPhone: visit.visitor?.mobile || '',
      purpose: visit.visit_purpose || 'Visit',
      status: visit.visit_status,
      flat: flatIdentifier,
    };
  }

  async sendVisitPassWhatsApp(
    visitId: string,
    userId: string,
    passedOrgContext?: any,
  ) {
    const orgContext =
      passedOrgContext ??
      (await this.organizationContextService.getCurrentOrganization({} as any));

    const organizationId =
      orgContext.targetOrganizationId ??
      orgContext.organizationId ??
      orgContext.organization_id;

    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }

    const resRepo = this.dataSource.getRepository(Resident);
    let resident: Resident | null = null;
    if (typeof resRepo.findOne === 'function') {
      try {
        resident = await resRepo.findOne({
          where: { user_id: userId, organization_id: organizationId },
          relations: { flat: true },
        });
      } catch {
        resident = await resRepo.findOneBy({
          user_id: userId,
          organization_id: organizationId,
        });
      }
    } else {
      resident = await resRepo.findOneBy({
        user_id: userId,
        organization_id: organizationId,
      });
    }

    if (!resident) {
      throw new NotFoundException('Resident record not found');
    }

    if (!resident.flat && resident.flat_id) {
      try {
        const flatRepo = this.dataSource.getRepository(Flat);
        if (flatRepo) {
          const flatObj =
            typeof flatRepo.findOneBy === 'function'
              ? await flatRepo.findOneBy({
                  id: resident.flat_id,
                  organization_id: organizationId,
                })
              : null;
          if (flatObj) {
            (resident as any).flat = flatObj;
          }
        }
      } catch {}
    }

    const visit = await this.dataSource.getRepository(VisitorVisit).findOne({
      where: {
        id: visitId,
        organization_id: organizationId,
      },
      relations: { visitor: true, host_resident: true },
    });

    if (!visit) {
      throw new NotFoundException('Visitor visit not found');
    }

    if (visit.host_resident_id !== resident.id) {
      throw new ForbiddenException(
        'You can only send passes for your own visitor visits',
      );
    }

    if (
      visit.visit_status !== 'CONFIRMED' &&
      visit.visit_status !== 'PENDING'
    ) {
      throw new ForbiddenException(
        `Cannot dispatch WhatsApp pass for visit with status ${visit.visit_status}`,
      );
    }

    const recipientMobile = visit.visitor?.mobile;
    if (!recipientMobile) {
      throw new ForbiddenException(
        'Visitor phone number is not available for WhatsApp sharing',
      );
    }

    // Ensure digital pass exists
    const passInfo = await this.getVisitPass(visitId, userId, orgContext);
    const passCode = passInfo.passCode;
    const guestName = visit.visitor?.name || 'Guest';
    const hostName = resident.name || 'Resident';
    const flatNo = resident.flat?.flat_identifier
      ? `Flat ${resident.flat.flat_identifier}`
      : resident.flat_id
        ? `Flat #${resident.flat_id}`
        : 'your registered flat';
    const societyName = orgContext.organizationName || 'SocietyOS Community';

    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(
      passCode,
    )}&color=0f4c81`;

    const caption =
      `✨ *WELCOME TO ${societyName.toUpperCase()}!* ✨\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🎫 *DIGITAL VISITOR FASTPASS TICKET*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👋 Dear *${guestName}*,\n` +
      `You have been pre-approved for entry at *${societyName}* by *${hostName}* (${flatNo}).\n\n` +
      `🔑 *FastPass Code:* \`${passCode}\`\n` +
      `📅 *Validity:* Active for 24 Hours\n` +
      `🚪 *Authorized Gate:* Main Gate / All Society Gates\n\n` +
      `📌 *Instructions:* Show the attached QR code image or Pass Code to security at the gate scanner for instant entry.\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `_Powered by SocietyOS Gate Security_`;

    let sendResult: { success: boolean; messageId?: string; error?: string } = {
      success: false,
    };
    if (this.whatsAppService) {
      const provider = this.whatsAppService.getProvider();
      if (typeof provider.sendImage === 'function') {
        sendResult = await provider.sendImage(
          recipientMobile,
          qrImageUrl,
          caption,
        );
        if (!sendResult.success) {
          // Fallback to text message if sendImage failed
          sendResult = await provider.sendMessage(
            recipientMobile,
            `${caption}\n\n📲 *QR Link:* ${qrImageUrl}`,
          );
        }
      } else {
        sendResult = await provider.sendMessage(
          recipientMobile,
          `${caption}\n\n📲 *QR Link:* ${qrImageUrl}`,
        );
      }
    } else {
      sendResult = {
        success: false,
        error: 'WhatsApp integration is not available',
      };
    }

    // Record audit log via auditService directly
    if (
      this.auditService &&
      typeof (this.auditService as any).log === 'function'
    ) {
      const meta = extractRequestMeta(undefined);
      const auditCtx = resolveAuditContext({
        orgContext,
        actorUserId: userId,
        entityOrganizationId: organizationId,
      });
      void (this.auditService as any).log({
        ...auditCtx,
        action: 'NOTIFY',
        entity_type: 'VISITOR_PASS',
        entity_id: passInfo.passId,
        old_values: null,
        new_values: {
          action: 'VISITOR_PASS_WHATSAPP_DISPATCHED',
          visit_id: visit.id,
          recipient_masked: recipientMobile.replace(
            /(\d{2})\d+(\d{4})/,
            '$1****$2',
          ),
          success: sendResult.success,
          message_id: sendResult.messageId,
        },
        ...meta,
      });
    }

    return {
      success: sendResult.success,
      messageId: sendResult.messageId,
      error: sendResult.error,
      passCode,
      recipient: recipientMobile,
    };
  }
}
