import { VisitorLiveEvents } from './live/visitor-live.events';
import { randomUUID } from 'crypto';
import { Injectable, ForbiddenException, Optional } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { VisitorPass } from '../database/entities/visitor-pass.entity';
import { Visitor } from '../database/entities/visitor.entity';
import { VisitorVisit } from '../database/entities/visitor-visit.entity';
import { OrganizationContextService } from '../organization/organization-context.service';
import { Request } from 'express';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/audit.enums';
import { AuditCallContext, extractRequestMeta, recordAudit, resolveAuditContext, toSnapshot } from '../audit/audit-context';

@Injectable()
export class VisitorPassService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly organizationContextService: OrganizationContextService,
    private readonly auditService: AuditService,
    @Optional() private readonly liveEvents?: VisitorLiveEvents,
  ) {}

  private async publishPassChange(pass: VisitorPass): Promise<void> {
    if (!this.liveEvents) return;
    try {
      const visits = await this.dataSource.getRepository(VisitorVisit).find({
        where: pass.visitor_visit_id
          ? { id: pass.visitor_visit_id, organization_id: pass.organization_id }
          : { visitor_id: pass.visitor_id, organization_id: pass.organization_id },
        select: { id: true, organization_id: true },
      });
      for (const visit of visits) this.liveEvents.publish({ ...visit, updatedAt: new Date() }, 'visit.pass_changed');
    } catch { /* Committed pass writes remain successful if invalidation fails. */ }
  }

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

  async createVisitorPass(
    createVisitorPassDto: {
      organization_id: string;
      visitor_id: string;
      visitor_visit_id?: string;
      issuer?: string;
      pass_status: string;
      validity_start: Date;
      validity_end: Date;
    },
    passedOrgContext?: any,
  ) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

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
      createVisitorPassDto.organization_id &&
      createVisitorPassDto.organization_id !== targetOrganizationId
    ) {
      throw new ForbiddenException(
        'You can only create visitor passes in your organization',
      );
    }

    // Validate visitor belongs to the target organization
    const visitorRepository = this.dataSource.getRepository(Visitor);
    const visitor = await visitorRepository.findOneBy({
      id: createVisitorPassDto.visitor_id,
      organization_id: targetOrganizationId,
    });

    if (!visitor) {
      throw new ForbiddenException('Visitor not found or access denied');
    }

    // If visitor_visit_id is provided, validate it belongs to the target organization
    if (createVisitorPassDto.visitor_visit_id) {
      const visitRepository = this.dataSource.getRepository(VisitorVisit);
      const visitorVisit = await visitRepository.findOneBy({
        id: createVisitorPassDto.visitor_visit_id,
        organization_id: targetOrganizationId,
      });

      if (!visitorVisit) {
        throw new ForbiddenException(
          'Visitor visit not found or access denied',
        );
      }
      if (visitorVisit.visitor_id !== createVisitorPassDto.visitor_id) {
        throw new ForbiddenException(
          'Visitor visit does not belong to the specified visitor',
        );
      }
    }

    // Validate pass status
    const validStatuses = ['ACTIVE', 'EXPIRED', 'REVOKED'];
    if (!validStatuses.includes(createVisitorPassDto.pass_status)) {
      throw new ForbiddenException('Invalid pass status');
    }

    const start = new Date(createVisitorPassDto.validity_start);
    const end = new Date(createVisitorPassDto.validity_end);

    if (end <= start) {
      throw new ForbiddenException('Validity end must be after start');
    }

    const visitorPass = this.dataSource.getRepository(VisitorPass).create({
      id: randomUUID(),
      organization_id: targetOrganizationId,
      visitor_id: createVisitorPassDto.visitor_id,
      visitor_visit_id: createVisitorPassDto.visitor_visit_id,
      issuer: createVisitorPassDto.issuer,
      pass_status: createVisitorPassDto.pass_status as
        'ACTIVE' | 'EXPIRED' | 'REVOKED',
      validity_start: start,
      validity_end: end,
    } as Partial<VisitorPass>);

    await this.dataSource.getRepository(VisitorPass).save(visitorPass);
    await this.publishPassChange(visitorPass);
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (visitorPass as any).organization_id,
      }),
      action: AuditAction.CREATE,
      entity_type: AuditEntityType.VISITOR_PASS,
      entity_id: (visitorPass as any).id ?? null,
      old_values: null,
      new_values: toSnapshot(visitorPass),
      ...extractRequestMeta(undefined),
    } as never);
    return visitorPass;
  }

  async findAll(passedOrgContext?: any) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    const query = this.dataSource
      .getRepository(VisitorPass)
      .createQueryBuilder('visitor_pass');

    const organizationId = orgContext.isSuperAdmin
      ? orgContext.targetOrganizationId
      : orgContext.organization_id;
    if (!organizationId) throw new ForbiddenException('Organization context is required');
    query.where('visitor_pass.organization_id = :orgId', { orgId: organizationId });

    return query.getMany();
  }

  async findOne(id: string, passedOrgContext?: any) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    const visitorPass = await this.dataSource
      .getRepository(VisitorPass)
      .findOneBy({
        id,
        organization_id:
          orgContext.isSuperAdmin && orgContext.targetOrganizationId
            ? orgContext.targetOrganizationId
            : orgContext.organization_id,
      });

    if (!visitorPass) {
      throw new ForbiddenException('Visitor pass not found or access denied');
    }
    return visitorPass;
  }

  async update(
    id: string,
    updateVisitorPassDto: {
      pass_status?: string;
      validity_start?: Date;
      validity_end?: Date;
      organization_id?: string;
    },
    passedOrgContext?: any,
  ) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    const visitorPass = await this.dataSource
      .getRepository(VisitorPass)
      .findOneBy({
        id,
        organization_id:
          orgContext.isSuperAdmin && orgContext.targetOrganizationId
            ? orgContext.targetOrganizationId
            : orgContext.organization_id,
      });

    if (!visitorPass) {
      throw new ForbiddenException('Visitor pass not found or access denied');
    }

    if (!orgContext.isSuperAdmin) {
      if (visitorPass.organization_id !== orgContext.organization_id) {
        throw new ForbiddenException(
          'You can only update visitor passes in your organization',
        );
      }
    }

    const oldValues = toSnapshot(visitorPass);
    if (updateVisitorPassDto.pass_status) {
      const validStatuses = ['ACTIVE', 'EXPIRED', 'REVOKED'];
      if (!validStatuses.includes(updateVisitorPassDto.pass_status)) {
        throw new ForbiddenException('Invalid pass status');
      }
      visitorPass.pass_status = updateVisitorPassDto.pass_status as
        'ACTIVE' | 'EXPIRED' | 'REVOKED';
    }
    if (updateVisitorPassDto.validity_start) {
      visitorPass.validity_start = new Date(
        updateVisitorPassDto.validity_start,
      );
    }
    if (updateVisitorPassDto.validity_end) {
      visitorPass.validity_end = new Date(updateVisitorPassDto.validity_end);
    }

    await this.dataSource.getRepository(VisitorPass).save(visitorPass);
    await this.publishPassChange(visitorPass);
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (visitorPass as any).organization_id,
      }),
      action: AuditAction.UPDATE,
      entity_type: AuditEntityType.VISITOR_PASS,
      entity_id: (visitorPass as any).id ?? null,
      old_values: oldValues,
      new_values: toSnapshot(visitorPass),
      ...extractRequestMeta(undefined),
    } as never);
    return visitorPass;
  }

  async remove(id: string, passedOrgContext?: any) {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    const visitorPass = await this.dataSource
      .getRepository(VisitorPass)
      .findOneBy({
        id,
        organization_id:
          orgContext.isSuperAdmin && orgContext.targetOrganizationId
            ? orgContext.targetOrganizationId
            : orgContext.organization_id,
      });

    if (!visitorPass) {
      throw new ForbiddenException('Visitor pass not found or access denied');
    }

    if (!orgContext.isSuperAdmin) {
      if (visitorPass.organization_id !== orgContext.organization_id) {
        throw new ForbiddenException(
          'You can only revoke visitor passes in your organization',
        );
      }
    }

    const oldValues = toSnapshot(visitorPass);
    visitorPass.pass_status = 'REVOKED' as const;
    await this.dataSource.getRepository(VisitorPass).save(visitorPass);
    await this.publishPassChange(visitorPass);
    await recordAudit(this.auditService as any, {
      ...resolveAuditContext({
        orgContext,
        entityOrganizationId: (visitorPass as any).organization_id,
      }),
      action: AuditAction.REVOKE,
      entity_type: AuditEntityType.VISITOR_PASS,
      entity_id: (visitorPass as any).id ?? null,
      old_values: oldValues,
      new_values: null,
      ...extractRequestMeta(undefined),
    } as never);
    return visitorPass;
  }

  async ensureVisitorPassForVisit(
    visitId: string,
    passedOrgContext?: any,
    issuerName?: string,
  ): Promise<VisitorPass> {
    const orgContext =
      (passedOrgContext ??
        (await this.organizationContextService.getCurrentOrganization(
          {} as any,
        ))) as any;

    const targetOrganizationId = orgContext.isSuperAdmin
      ? orgContext.targetOrganizationId
      : orgContext.organization_id;

    if (!targetOrganizationId) {
      throw new ForbiddenException('Organization context is required');
    }

    const visit = await this.dataSource.getRepository(VisitorVisit).findOne({
      where: {
        id: visitId,
        organization_id: targetOrganizationId,
      },
      relations: { visitor: true, host_resident: true },
    });

    if (!visit) {
      throw new ForbiddenException('Visitor visit not found or access denied');
    }

    if (visit.visit_status !== 'CONFIRMED' && visit.visit_status !== 'PENDING') {
      throw new ForbiddenException(
        `Cannot issue pass for visit with status ${visit.visit_status}`,
      );
    }

    // Check if an existing pass already exists for this visit
    const passRepo = this.dataSource.getRepository(VisitorPass);
    let existingPass = await passRepo.findOne({
      where: {
        visitor_visit_id: visit.id,
        organization_id: targetOrganizationId,
      },
    });

    if (existingPass) {
      return existingPass;
    }

    // Pass does not exist yet: create it idempotently
    const validityStart = visit.expected_entry_time
      ? new Date(visit.expected_entry_time)
      : new Date();
    const validityEnd = new Date(validityStart.getTime() + 24 * 60 * 60 * 1000);

    const { randomUUID } = await import('crypto');
    const newPass = passRepo.create({
      id: randomUUID(),
      organization_id: targetOrganizationId,
      visitor_id: visit.visitor_id,
      visitor_visit_id: visit.id,
      issuer: issuerName || 'Resident',
      pass_status: 'ACTIVE',
      validity_start: validityStart,
      validity_end: validityEnd,
    } as Partial<VisitorPass>);

    try {
      await passRepo.save(newPass);
      await this.publishPassChange(newPass);
      this.emitAudit(
        AuditAction.CREATE,
        AuditEntityType.VISITOR_PASS,
        newPass.id,
        null,
        toSnapshot(newPass),
        { orgContext, entityOrganizationId: newPass.organization_id },
      );
      return newPass;
    } catch (err: any) {
      // In case of concurrent creation race, fetch existing
      const racePass = await passRepo.findOne({
        where: {
          visitor_visit_id: visit.id,
          organization_id: targetOrganizationId,
        },
      });
      if (racePass) {
        return racePass;
      }
      throw err;
    }
  }
}
