import { AuditEntityType } from './audit.enums';
export declare const AUDIT_REDACTED = "[REDACTED]";
export declare const AUDIT_TRUNCATED = "[TRUNCATED]";
export declare const AUDIT_CIRCULAR = "[CIRCULAR]";
export declare class AuditSanitizer {
    sanitizeSnapshot(entityType: AuditEntityType | string | undefined | null, input: unknown): Record<string, unknown> | null;
    private cloneAndSanitize;
}
