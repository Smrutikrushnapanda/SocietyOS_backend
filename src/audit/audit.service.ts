import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { AuditLog } from './audit.entity';
import { AuditSanitizer } from './audit-sanitizer';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from './audit.enums';
import { AuditLogFilters, AuditLogInput, AuditLogPage } from './audit.dto';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 200;

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly sanitizer: AuditSanitizer,
  ) {}

  /**
   * Persist a single audit row.
   *
   * Behavior (approved Phase 10 spec):
   *  - old_values/new_values are ALWAYS sanitized centrally before persist.
   *  - if sanitization fails, null snapshots are used (never raw input).
   *  - never throws into the business operation.
   *  - insert only: never updates or deletes.
   */
  async record(input: AuditLogInput): Promise<void> {
    try {
      let oldValues: Record<string, unknown> | null = null;
      let newValues: Record<string, unknown> | null = null;

      try {
        oldValues = this.sanitizer.sanitizeSnapshot(
          input.entity_type,
          input.old_values ?? null,
        );
        newValues = this.sanitizer.sanitizeSnapshot(
          input.entity_type,
          input.new_values ?? null,
        );
      } catch (sanitizeError) {
        // Fail safe: never persist unsanitized input.
        this.logger.warn(
          `Audit sanitization failed for ${input.entity_type}/${input.action}; persisting null snapshots`,
        );
        oldValues = null;
        newValues = null;
        void sanitizeError;
      }

      const repository = this.dataSource.getRepository(AuditLog);
      const entity = repository.create({
        id: input.id ?? randomUUID(),
        actor_user_id: input.actor_user_id ?? null,
        actor_organization_id: input.actor_organization_id ?? null,
        target_organization_id: input.target_organization_id ?? null,
        action: input.action,
        entity_type: input.entity_type,
        entity_id: input.entity_id ?? null,
        old_values: oldValues,
        new_values: newValues,
        ip_address: input.ip_address ?? null,
        user_agent: input.user_agent ?? null,
        created_at: new Date(),
      });

      await repository.save(entity);
    } catch (error) {
      // Audit failures must NEVER fail the business operation.
      this.logger.error(
        `Failed to write audit log for ${input.entity_type}/${input.action}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Organization-scoped audit list. Always scoped by
   * target_organization_id = organizationId.
   *
   * `filters.organization_id` (if ever supplied) is ignored — the resolved
   * organization from OrganizationContextService is the only scope source.
   */
  async findAll(
    organizationId: string,
    filters: AuditLogFilters = {},
  ): Promise<AuditLogPage> {
    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }

    const repository = this.dataSource.getRepository(AuditLog);
    const query = repository.createQueryBuilder('audit');

    query.where('audit.target_organization_id = :organizationId', {
      organizationId,
    });

    const action = this.parseEnumFilter(filters.action, AUDIT_ACTIONS, 'action');
    if (action) {
      query.andWhere('audit.action = :action', { action });
    }

    const entityType = this.parseEnumFilter(
      filters.entity_type,
      AUDIT_ENTITY_TYPES,
      'entity_type',
    );
    if (entityType) {
      query.andWhere('audit.entity_type = :entityType', { entityType });
    }

    if (filters.entity_id) {
      query.andWhere('audit.entity_id = :entityId', {
        entityId: String(filters.entity_id),
      });
    }

    if (filters.actor_user_id) {
      query.andWhere('audit.actor_user_id = :actorUserId', {
        actorUserId: String(filters.actor_user_id),
      });
    }

    const from = this.parseDateFilter(filters.from, 'from');
    if (from) {
      query.andWhere('audit.created_at >= :from', { from });
    }

    const to = this.parseDateFilter(filters.to, 'to');
    if (to) {
      query.andWhere('audit.created_at <= :to', { to });
    }

    query.orderBy('audit.created_at', 'DESC');

    const page = this.parsePositiveInt(
      filters.page,
      1,
      1,
      Number.MAX_SAFE_INTEGER,
    );
    const limit = this.parsePositiveInt(
      filters.limit,
      DEFAULT_PAGE_SIZE,
      1,
      MAX_PAGE_SIZE,
    );

    query.skip((page - 1) * limit).take(limit);

    const [items, total] = await query.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
    };
  }

  /**
   * Organization-scoped single record. Returns null when the record does not
   * exist OR belongs to a different organization (prevents cross-org IDOR).
   */
  async findOne(id: string, organizationId: string): Promise<AuditLog | null> {
    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }

    return this.dataSource.getRepository(AuditLog).findOne({
      where: { id, target_organization_id: organizationId },
    });
  }

  private parseEnumFilter<T extends string>(
    value: string | undefined,
    allowed: T[],
    field: string,
  ): T | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (!allowed.includes(value as T)) {
      throw new BadRequestException(`Invalid ${field} filter`);
    }
    return value as T;
  }

  private parseDateFilter(
    value: string | undefined,
    field: string,
  ): Date | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`Invalid ${field} filter`);
    }
    return parsed;
  }

  private parsePositiveInt(
    value: number | string | undefined,
    fallback: number,
    min: number,
    max: number,
  ): number {
    if (value === undefined || value === null || value === '') {
      return fallback;
    }
    const parsed = Number.parseInt(String(value), 10);
    if (Number.isNaN(parsed)) {
      return fallback;
    }
    return Math.min(Math.max(parsed, min), max);
  }
}
