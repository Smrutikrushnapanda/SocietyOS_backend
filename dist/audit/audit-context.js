"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAuditContext = resolveAuditContext;
exports.toSnapshot = toSnapshot;
exports.recordAudit = recordAudit;
exports.extractRequestMeta = extractRequestMeta;
function resolveAuditContext(input) {
    const org = input.orgContext ?? null;
    const isSuperAdmin = Boolean(org?.isSuperAdmin);
    const resolvedOrganizationId = org?.organizationId ?? org?.organization_id ?? null;
    const actorUserId = input.actorUserId ?? org?.userId ?? null;
    const targetOrganizationId = isSuperAdmin
        ? org?.targetOrganizationId ?? null
        : resolvedOrganizationId ?? input.entityOrganizationId ?? null;
    return {
        actor_user_id: actorUserId,
        actor_organization_id: isSuperAdmin ? null : resolvedOrganizationId,
        target_organization_id: targetOrganizationId,
    };
}
function toSnapshot(entity) {
    if (entity === null || entity === undefined || typeof entity !== 'object') {
        return null;
    }
    return { ...entity };
}
async function recordAudit(auditService, input) {
    try {
        await auditService.record(input);
    }
    catch {
    }
}
function extractRequestMeta(request) {
    if (!request || typeof request !== 'object') {
        return { ip_address: null, user_agent: null };
    }
    const req = request;
    const ip = typeof req.ip === 'string'
        ? req.ip
        : typeof req.headers?.['x-forwarded-for'] === 'string'
            ? req.headers['x-forwarded-for'].split(',')[0].trim()
            : null;
    const ua = typeof req.headers?.['user-agent'] === 'string'
        ? req.headers['user-agent']
        : typeof req.get === 'function'
            ? (req.get('user-agent') ?? null)
            : null;
    return { ip_address: ip ?? null, user_agent: ua ?? null };
}
//# sourceMappingURL=audit-context.js.map