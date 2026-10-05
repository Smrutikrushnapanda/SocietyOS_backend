export interface AuditOrganizationContextLike {
    userId?: string | null;
    organizationId?: string | null;
    organization_id?: string | null;
    isSuperAdmin?: boolean;
    targetOrganizationId?: string | null;
}
export interface ResolveAuditContextInput {
    orgContext?: AuditOrganizationContextLike | null;
    actorUserId?: string | null;
    entityOrganizationId?: string | null;
}
export interface ResolvedAuditContext {
    actor_user_id: string | null;
    actor_organization_id: string | null;
    target_organization_id: string | null;
}
export declare function resolveAuditContext(input: ResolveAuditContextInput): ResolvedAuditContext;
export declare function toSnapshot(entity: unknown): Record<string, unknown> | null;
export interface AuditCallContext {
    orgContext?: AuditOrganizationContextLike | null;
    actorUserId?: string | null;
    entityOrganizationId?: string | null;
    request?: unknown;
}
export declare function recordAudit(auditService: {
    record(input: never): Promise<unknown>;
}, input: never): Promise<void>;
export declare function extractRequestMeta(request: unknown): {
    ip_address: string | null;
    user_agent: string | null;
};
