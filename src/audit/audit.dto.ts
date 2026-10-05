import { AuditAction, AuditEntityType } from './audit.enums';
import { AuditLog } from './audit.entity';

/**
 * Input accepted by AuditService.record().
 *
 * Note: old_values / new_values / actor_organization_id / target_organization_id
 * are optional/nullable. The actor_organization_id is NULL for SUPER_ADMIN.
 * entity_id is nullable.
 */
export interface AuditLogInput {
  id?: string;
  actor_user_id?: string | null;
  actor_organization_id?: string | null;
  target_organization_id?: string | null;
  action: AuditAction;
  entity_type: AuditEntityType;
  entity_id?: string | null;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

/**
 * Allowed read filters for the audit list endpoint.
 *
 * IMPORTANT: organization_id is deliberately NOT a filter. The organization is
 * always taken from the resolved OrganizationContextService context and never
 * from query/body input.
 */
export interface AuditLogFilters {
  action?: string;
  entity_type?: string;
  entity_id?: string;
  actor_user_id?: string;
  from?: string;
  to?: string;
  page?: number | string;
  limit?: number | string;
}

export interface AuditLogPage {
  items: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
