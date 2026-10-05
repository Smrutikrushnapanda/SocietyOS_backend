import { AuditAction, AuditEntityType } from './audit.enums';
export declare class AuditLog {
    id: string;
    actor_user_id: string | null;
    actor_organization_id: string | null;
    target_organization_id: string | null;
    action: AuditAction;
    entity_type: AuditEntityType;
    entity_id: string | null;
    old_values: Record<string, unknown> | null;
    new_values: Record<string, unknown> | null;
    ip_address: string | null;
    user_agent: string | null;
    created_at: Date;
}
