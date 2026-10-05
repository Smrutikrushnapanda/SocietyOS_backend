import { AuditAction, AuditEntityType } from './audit.enums';
import { AuditLog } from './audit.entity';
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
