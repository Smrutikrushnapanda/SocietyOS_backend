"""Phase 10 Step 2 part 1: shared patch helpers."""
import re
from pathlib import Path

ROOT = Path('/Users/smrutikrushnapanda/Downloads/Personal/Sociaty-OS/backend/societyos-backend/src')

HELPER = '''  private buildAuditContext(orgContext: any, entityOrganizationId?: string | null, actorUserId?: string | null) {
    return resolveAuditContext({ orgContext, entityOrganizationId: entityOrganizationId ?? null, actorUserId: actorUserId ?? null });
  }

  private async recordAuditEvent(input: {
    orgContext: any;
    entityOrganizationId?: string | null;
    actorUserId?: string | null;
    action: AuditAction;
    entityType: AuditEntityType;
    entityId?: string | null;
    oldValues?: Record<string, unknown> | null;
    newValues?: Record<string, unknown> | null;
  }): Promise<void> {
    const ctx = this.buildAuditContext(input.orgContext, input.entityOrganizationId, input.actorUserId);
    try {
      await this.auditService.record({
        actor_user_id: ctx.actor_user_id,
        actor_organization_id: ctx.actor_organization_id,
        target_organization_id: ctx.target_organization_id,
        action: input.action,
        entity_type: input.entityType,
        entity_id: input.entityId ?? null,
        old_values: input.oldValues ?? null,
        new_values: input.newValues ?? null,
      });
    } catch {
      // Best-effort: never fail the business operation.
    }
  }
'''

IND = '    '

def ensure_imports(text: str, depth: str) -> str:
    if '../audit/audit.service' in text:
        return text
    lines = text.split('\n')
    last = max(i for i, l in enumerate(lines) if l.startswith('import '))
    lines.insert(last + 1, f"import {{ AuditService }} from '{depth}audit/audit.service';")
    lines.insert(last + 2, f"import {{ AuditAction, AuditEntityType }} from '{depth}audit/audit.enums';")
    lines.insert(last + 3, f"import {{ resolveAuditContext, toSnapshot }} from '{depth}audit/audit-context';")
    return '\n'.join(lines)

def inject_ctor(text: str) -> str:
    if 'private readonly auditService: AuditService' in text:
        return text
    m = re.search(r'(private readonly organizationContextService: OrganizationContextService,\n)', text)
    if m:
        return text.replace(m.group(1), m.group(1) + '    private readonly auditService: AuditService,\n', 1)
    m = re.search(r'(private readonly dataSource: DataSource,\n)', text)
    assert m, 'no constructor anchor'
    return text.replace(m.group(1), m.group(1) + '    private readonly auditService: AuditService,\n', 1)

def ensure_helper(text: str) -> str:
    if 'recordAuditEvent' in text:
        return text
    m = re.search(r'\n  async ', text)
    assert m, 'no async method'
    return text[:m.start()] + '\n' + HELPER + text[m.start():]

def add_call(text: str, anchor: str, call: str, count=1) -> str:
    assert anchor in text, f'anchor missing: {anchor[:70]}'
    return text.replace(anchor, anchor + '\n' + call, count)

def call(action, etype, eid, old, new, org='orgContext', extra_org='undefined', actor='undefined'):
    return (
        f"{IND}await this.recordAuditEvent({{\n"
        f"{IND}  orgContext: {org},\n"
        f"{IND}  entityOrganizationId: {extra_org},\n"
        f"{IND}  actorUserId: {actor},\n"
        f"{IND}  action: AuditAction.{action},\n"
        f"{IND}  entityType: AuditEntityType.{etype},\n"
        f"{IND}  entityId: {eid},\n"
        f"{IND}  oldValues: {old},\n"
        f"{IND}  newValues: {new},\n"
        f"{IND}}});"
    )
