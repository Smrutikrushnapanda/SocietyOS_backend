/**
 * Phase 10 — shared audit wiring helpers.
 *
 * These helpers ONLY translate the already-resolved organization context
 * (produced by the existing OrganizationContextService / OrganizationGuard)
 * into audit actor/target fields. They do NOT resolve organizations themselves
 * and never read a client-supplied organization_id for authorization.
 */

export interface AuditOrganizationContextLike {
  userId?: string | null;
  organizationId?: string | null;
  /** Phase 5/6 services use snake_case organization_id. */
  organization_id?: string | null;
  isSuperAdmin?: boolean;
  targetOrganizationId?: string | null;
}

export interface ResolveAuditContextInput {
  orgContext?: AuditOrganizationContextLike | null;
  actorUserId?: string | null;
  /**
   * Fallback target organization, taken from the affected entity's own
   * organization_id. Only used when no resolved organization context exists
   * (e.g. the currently unguarded Phase 5/6 endpoints).
   */
  entityOrganizationId?: string | null;
}

export interface ResolvedAuditContext {
  actor_user_id: string | null;
  actor_organization_id: string | null;
  target_organization_id: string | null;
}

export function resolveAuditContext(
  input: ResolveAuditContextInput,
): ResolvedAuditContext {
  const org = input.orgContext ?? null;
  const isSuperAdmin = Boolean(org?.isSuperAdmin);
  const resolvedOrganizationId =
    org?.organizationId ?? (org as any)?.organization_id ?? null;

  const actorUserId = input.actorUserId ?? org?.userId ?? null;

  const targetOrganizationId = isSuperAdmin
    ? org?.targetOrganizationId ?? null
    : resolvedOrganizationId ?? input.entityOrganizationId ?? null;

  return {
    actor_user_id: actorUserId,
    // SUPER_ADMIN is platform-scoped and has no actor organization.
    actor_organization_id: isSuperAdmin ? null : resolvedOrganizationId,
    target_organization_id: targetOrganizationId,
  };
}

/**
 * Shallow snapshot of an entity for audit old/new values. The snapshot is
 * passed through the central AuditSanitizer inside AuditService.record() —
 * call sites must NOT sanitize manually.
 */
export function toSnapshot(
  entity: unknown,
): Record<string, unknown> | null {
  if (entity === null || entity === undefined || typeof entity !== 'object') {
    return null;
  }
  return { ...(entity as Record<string, unknown>) };
}

/**
 * Optional per-call audit context threaded from controllers (or resolved
 * inside services). NEVER carries a client-supplied organization_id for
 * authorization — the target org always comes from the resolved orgContext
 * (or, when none exists, the affected entity's own organization_id).
 */
export interface AuditCallContext {
  orgContext?: AuditOrganizationContextLike | null;
  actorUserId?: string | null;
  entityOrganizationId?: string | null;
  request?: unknown;
}

/** Best-effort audit write: audit failures must NEVER fail the business op. */
export async function recordAudit(
  auditService: { record(input: never): Promise<unknown> },
  input: never,
): Promise<void> {
  try {
    await auditService.record(input);
  } catch {
    // Swallowed deliberately: AuditService.record() already guarantees this,
    // this is defense-in-depth at the call site.
  }
}

/** Extract optional request metadata (ip / user-agent) for audit rows. */
export function extractRequestMeta(request: unknown): {
  ip_address: string | null;
  user_agent: string | null;
} {
  if (!request || typeof request !== 'object') {
    return { ip_address: null, user_agent: null };
  }
  const req = request as Record<string, any>;
  const ip =
    typeof req.ip === 'string'
      ? req.ip
      : typeof req.headers?.['x-forwarded-for'] === 'string'
        ? req.headers['x-forwarded-for'].split(',')[0].trim()
        : null;
  const ua =
    typeof req.headers?.['user-agent'] === 'string'
      ? req.headers['user-agent']
      : typeof req.get === 'function'
        ? (req.get('user-agent') ?? null)
        : null;
  return { ip_address: ip ?? null, user_agent: ua ?? null };
}
