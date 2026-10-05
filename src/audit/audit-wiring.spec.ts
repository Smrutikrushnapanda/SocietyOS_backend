import * as fs from 'fs';
import * as path from 'path';
import { BuildingService } from '../building/building.service';
import { ResidentService } from '../resident/resident.service';
import { ComplaintService } from '../complaints/complaint.service';
import { NoticeService } from '../notices/notice.service';
import { PollService } from '../polls/poll.service';
import { FileService } from '../files/file.service';
import { AuditAction, AuditEntityType } from './audit.enums';
import {
  extractRequestMeta,
  resolveAuditContext,
  toSnapshot,
} from './audit-context';

/**
 * Phase 10 Step 2 — Audit wiring tests.
 *
 * Coverage groups:
 *  A. Exact 48-event mapping (source-level, per service file)
 *  B. No duplicate / no missing events per file (multiset equality)
 *  C. Events only use approved actions & entity types
 *  D. Create events capture old_values: null
 *  E. Delete-style events capture new_values: null
 *  F. Services never touch the audit repository directly
 *  G. Behavioral: mutation methods call AuditService.record once, with the
 *     resolved actor/target organization and entity snapshots
 *  H. Audit failure never fails the business operation
 *  I. Read-only paths do not emit audit events
 *  J. Context helpers (resolveAuditContext / toSnapshot / extractRequestMeta)
 */

type Pair = [AuditAction, AuditEntityType];

// The approved Phase 10 spec table — 48 events, authoritative.
const EXPECTED_EVENTS: Record<string, Pair[]> = {
  'building/building.service.ts': [
    [AuditAction.CREATE, AuditEntityType.BUILDING],
    [AuditAction.UPDATE, AuditEntityType.BUILDING],
    [AuditAction.DELETE, AuditEntityType.BUILDING],
  ],
  'floor/floor.service.ts': [
    [AuditAction.CREATE, AuditEntityType.FLOOR],
    [AuditAction.UPDATE, AuditEntityType.FLOOR],
    [AuditAction.DELETE, AuditEntityType.FLOOR],
  ],
  'flat/flat.service.ts': [
    [AuditAction.CREATE, AuditEntityType.FLAT],
    [AuditAction.UPDATE, AuditEntityType.FLAT],
    [AuditAction.DELETE, AuditEntityType.FLAT],
  ],
  'resident/resident.service.ts': [
    [AuditAction.CREATE, AuditEntityType.RESIDENT],
    [AuditAction.UPDATE, AuditEntityType.RESIDENT],
    [AuditAction.ASSIGN, AuditEntityType.RESIDENT],
    [AuditAction.UPDATE, AuditEntityType.RESIDENT],
  ],
  'visitors/visitor.service.ts': [
    [AuditAction.CREATE, AuditEntityType.VISITOR],
    [AuditAction.UPDATE, AuditEntityType.VISITOR],
    [AuditAction.DELETE, AuditEntityType.VISITOR],
  ],
  'visitors/visitor-visit.service.ts': [
    [AuditAction.CREATE, AuditEntityType.VISITOR_VISIT],
    [AuditAction.UPDATE, AuditEntityType.VISITOR_VISIT],
    [AuditAction.CANCEL, AuditEntityType.VISITOR_VISIT],
  ],
  'visitors/visitor-approval.service.ts': [
    [AuditAction.CREATE, AuditEntityType.VISITOR_APPROVAL],
    [AuditAction.UPDATE, AuditEntityType.VISITOR_APPROVAL],
    [AuditAction.REJECT, AuditEntityType.VISITOR_APPROVAL],
  ],
  'visitors/visitor-pass.service.ts': [
    [AuditAction.CREATE, AuditEntityType.VISITOR_PASS],
    [AuditAction.UPDATE, AuditEntityType.VISITOR_PASS],
    [AuditAction.REVOKE, AuditEntityType.VISITOR_PASS],
  ],
  'maintenance/maintenance-configuration.service.ts': [
    [AuditAction.CREATE, AuditEntityType.MAINTENANCE_CONFIGURATION],
    [AuditAction.UPDATE, AuditEntityType.MAINTENANCE_CONFIGURATION],
  ],
  'maintenance/maintenance-due.service.ts': [
    [AuditAction.GENERATE, AuditEntityType.MAINTENANCE_DUE],
    [AuditAction.MARK_PAID, AuditEntityType.MAINTENANCE_DUE],
    [AuditAction.MARK_OVERDUE, AuditEntityType.MAINTENANCE_DUE],
    [AuditAction.WAIVE_LATE_CHARGE, AuditEntityType.MAINTENANCE_DUE],
  ],
  'maintenance/payment.service.ts': [
    [AuditAction.CREATE, AuditEntityType.PAYMENT],
    [AuditAction.MARK_COMPLETED, AuditEntityType.PAYMENT],
    [AuditAction.MARK_FAILED, AuditEntityType.PAYMENT],
  ],
  'complaints/complaint.service.ts': [
    [AuditAction.CREATE, AuditEntityType.COMPLAINT],
    [AuditAction.UPDATE, AuditEntityType.COMPLAINT],
    [AuditAction.ASSIGN, AuditEntityType.COMPLAINT],
    [AuditAction.RESOLVE, AuditEntityType.COMPLAINT],
  ],
  'notices/notice.service.ts': [
    [AuditAction.CREATE, AuditEntityType.NOTICE],
    [AuditAction.PUBLISH, AuditEntityType.NOTICE],
    [AuditAction.EXPIRE, AuditEntityType.NOTICE],
    [AuditAction.ARCHIVE, AuditEntityType.NOTICE],
  ],
  'polls/poll.service.ts': [
    [AuditAction.CREATE, AuditEntityType.POLL],
    [AuditAction.START, AuditEntityType.POLL],
    [AuditAction.END, AuditEntityType.POLL],
    [AuditAction.VOTE, AuditEntityType.POLL],
  ],
  'files/file.service.ts': [
    [AuditAction.UPLOAD, AuditEntityType.FILE],
    [AuditAction.DELETE, AuditEntityType.FILE],
  ],
};

const SRC_ROOT = path.resolve(__dirname, '..');

function readServiceSource(relativePath: string): string {
  return fs.readFileSync(path.join(SRC_ROOT, relativePath), 'utf8');
}

function extractPairs(source: string): Pair[] {
  const regex =
    /action:\s*AuditAction\.([A-Z_]+),\s*\n\s*entity_type:\s*AuditEntityType\.([A-Z_]+)/g;
  const pairs: Pair[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(source)) !== null) {
    pairs.push([match[1] as AuditAction, match[2] as AuditEntityType]);
  }
  return pairs;
}

function sortPairs(pairs: Pair[]): string[] {
  return pairs.map(([a, e]) => `${a}/${e}`).sort();
}

describe('A/B/C. Phase 10 Step 2 — exact 48-event mapping', () => {
  it('wires exactly the 48 approved audit events across 15 services', () => {
    let total = 0;
    for (const [file, expected] of Object.entries(EXPECTED_EVENTS)) {
      const actual = extractPairs(readServiceSource(file));
      expect(sortPairs(actual)).toEqual(sortPairs(expected));
      total += actual.length;
    }
    expect(total).toBe(48);
  });

  it('uses only approved AuditAction / AuditEntityType values', () => {
    const approvedActions = new Set<string>(Object.values(AuditAction));
    const approvedEntities = new Set<string>(Object.values(AuditEntityType));
    for (const file of Object.keys(EXPECTED_EVENTS)) {
      for (const [action, entity] of extractPairs(readServiceSource(file))) {
        expect(approvedActions.has(action)).toBe(true);
        expect(approvedEntities.has(entity)).toBe(true);
      }
    }
  });

  it('emits no audit events outside the approved Phase 5–9 services', () => {
    const allowed = new Set(Object.keys(EXPECTED_EVENTS));
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'audit' || entry.name === 'node_modules') continue;
          walk(full);
        } else if (
          entry.name.endsWith('.service.ts') &&
          !entry.name.endsWith('.spec.ts')
        ) {
          const rel = path.relative(SRC_ROOT, full);
          const hasEvent = extractPairs(fs.readFileSync(full, 'utf8')).length > 0;
          if (hasEvent && !allowed.has(rel)) offenders.push(rel);
        }
      }
    };
    walk(SRC_ROOT);
    expect(offenders).toEqual([]);
  });
});

describe('D/E/F. Snapshot conventions and repository isolation', () => {
  it('D. every CREATE site passes old_values: null', () => {
    for (const [file, pairs] of Object.entries(EXPECTED_EVENTS)) {
      const expectedCreates = pairs.filter(
        ([a]) => a === AuditAction.CREATE,
      ).length;
      if (expectedCreates === 0) continue;
      const source = readServiceSource(file);
      const regex =
        /action:\s*AuditAction\.CREATE,[\s\S]{0,220}?old_values:\s*null,/g;
      expect((source.match(regex) ?? []).length).toBe(expectedCreates);
    }
  });

  it('E. every terminal (DELETE/CANCEL/REJECT/REVOKE) site passes new_values: null', () => {
    const terminals = new Set<string>([
      AuditAction.DELETE,
      AuditAction.CANCEL,
      AuditAction.REJECT,
      AuditAction.REVOKE,
    ]);
    for (const [file, pairs] of Object.entries(EXPECTED_EVENTS)) {
      const expected = pairs.filter(([a]) => terminals.has(a)).length;
      if (expected === 0) continue;
      const source = readServiceSource(file);
      const regex =
        /action:\s*AuditAction\.(DELETE|CANCEL|REJECT|REVOKE),[\s\S]{0,220}?new_values:\s*null,/g;
      expect((source.match(regex) ?? []).length).toBe(expected);
    }
  });

  it('F. no Phase 5–9 service references the AuditLog entity directly', () => {
    for (const file of Object.keys(EXPECTED_EVENTS)) {
      expect(readServiceSource(file)).not.toMatch(/AuditLog/);
    }
  });
});


// ─── Behavioral helpers ───────────────────────────────────────────────────────

const orgA = 'org-aaaaaaaa-0000-0000-0000-000000000001';

function makeAuditMock() {
  return { record: jest.fn().mockResolvedValue(undefined) };
}

function orgContextMock(overrides: Record<string, unknown> = {}): any {
  return {
    getCurrentOrganization: jest.fn().mockResolvedValue({
      userId: 'user-1',
      organizationId: orgA,
      organization_id: orgA,
      isSuperAdmin: false,
      isCrossOrganization: false,
      targetOrganizationId: null,
      ...overrides,
    }),
  };
}

describe('G/H/I. Behavioral wiring', () => {
  it('BuildingService.create records CREATE/BUILDING with actor and snapshots', async () => {
    const audit = makeAuditMock();
    const repo = {
      create: jest.fn((dto: any) => ({ ...dto })),
      save: jest.fn(async (e: any) => e),
    };
    const dataSource = { getRepository: jest.fn(() => repo) } as any;
    const service = new BuildingService(
      dataSource,
      orgContextMock() as any,
      audit as any,
    );

    const result = await service.create({
      organization_id: orgA,
      name: 'Tower A',
    });

    expect(audit.record).toHaveBeenCalledTimes(1);
    const arg = audit.record.mock.calls[0][0];
    expect(arg.action).toBe(AuditAction.CREATE);
    expect(arg.entity_type).toBe(AuditEntityType.BUILDING);
    expect(arg.entity_id).toBe(result.id);
    expect(arg.actor_user_id).toBe('user-1');
    expect(arg.actor_organization_id).toBe(orgA);
    expect(arg.target_organization_id).toBe(orgA);
    expect(arg.old_values).toBeNull();
    expect(arg.new_values).toMatchObject({ name: 'Tower A' });
  });

  it('H. BuildingService.create still succeeds when audit write fails', async () => {
    const audit = { record: jest.fn().mockRejectedValue(new Error('db down')) };
    const repo = {
      create: jest.fn((dto: any) => ({ ...dto })),
      save: jest.fn(async (e: any) => e),
    };
    const dataSource = { getRepository: jest.fn(() => repo) } as any;
    const service = new BuildingService(
      dataSource,
      orgContextMock() as any,
      audit as any,
    );

    await expect(
      service.create({ organization_id: orgA, name: 'Tower A' }),
    ).resolves.toBeDefined();
    expect(audit.record).toHaveBeenCalledTimes(1);
  });

  it('I. BuildingService.findAll does not emit audit events', async () => {
    const audit = makeAuditMock();
    const query: any = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    const dataSource = {
      getRepository: jest.fn(() => ({ createQueryBuilder: () => query })),
    } as any;
    const service = new BuildingService(
      dataSource,
      orgContextMock() as any,
      audit as any,
    );

    await service.findAll();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('ResidentService.assignFlat records ASSIGN/RESIDENT with old/new flat', async () => {
    const audit = makeAuditMock();
    const resident = {
      id: 'res-1',
      organization_id: orgA,
      flat_id: null,
      app_access_status: false,
    };
    const flat = { id: 'flat-1', organization_id: orgA };
    const residentRepo = {
      findOneBy: jest.fn(async () => resident),
      save: jest.fn(async (e: any) => e),
    };
    const flatRepo = {
      findOneBy: jest.fn(async () => flat),
      save: jest.fn(async (e: any) => e),
    };
    const dataSource = {
      getRepository: jest.fn((entity: any) =>
        entity === 'Flat' ? flatRepo : residentRepo,
      ),
    } as any;
    const service = new ResidentService(
      dataSource,
      orgContextMock() as any,
      audit as any,
    );

    await service.assignFlat('res-1', 'flat-1');

    expect(audit.record).toHaveBeenCalledTimes(1);
    const arg = audit.record.mock.calls[0][0];
    expect(arg.action).toBe(AuditAction.ASSIGN);
    expect(arg.entity_type).toBe(AuditEntityType.RESIDENT);
    expect(arg.old_values).toMatchObject({ flat_id: null });
    expect(arg.new_values).toMatchObject({ flat_id: 'flat-1' });
  });
});


describe('G/H. Phase 8/9 behavioral wiring', () => {
  it('ComplaintService.create records CREATE/COMPLAINT using passed orgContext', async () => {
    const audit = makeAuditMock();
    const repo = {
      create: jest.fn((dto: any) => ({ ...dto })),
      save: jest.fn(async (e: any) => e),
    };
    const dataSource = { getRepository: jest.fn(() => repo) } as any;
    const service = new ComplaintService(dataSource, audit as any);

    await service.create(
      {
        id: 'cmp-1',
        resident_id: 'res-1',
        category: 'PLUMBING',
        subject: 'Leak',
        description: 'desc',
      } as any,
      'res-1',
      { organizationId: orgA },
    );

    expect(audit.record).toHaveBeenCalledTimes(1);
    const arg = audit.record.mock.calls[0][0];
    expect(arg.action).toBe(AuditAction.CREATE);
    expect(arg.entity_type).toBe(AuditEntityType.COMPLAINT);
    expect(arg.target_organization_id).toBe(orgA);
    expect(arg.old_values).toBeNull();
  });

  it('ComplaintService.resolve records RESOLVE/COMPLAINT with status transition', async () => {
    const audit = makeAuditMock();
    const complaint = {
      id: 'cmp-1',
      organization_id: orgA,
      status: 'IN_PROGRESS',
      updated_at: null,
    };
    const complaintRepo = {
      findOne: jest.fn(async () => complaint),
      save: jest.fn(async (e: any) => e),
    };
    const historyRepo = { save: jest.fn(async (e: any) => e) };
    const dataSource = {
      getRepository: jest.fn((entity: any) =>
        entity.name === 'ComplaintStatusHistory' ? historyRepo : complaintRepo,
      ),
    } as any;
    const service = new ComplaintService(dataSource, audit as any);

    await service.resolve('cmp-1', 'fixed', { organizationId: orgA });

    expect(audit.record).toHaveBeenCalledTimes(1);
    const arg = audit.record.mock.calls[0][0];
    expect(arg.action).toBe(AuditAction.RESOLVE);
    expect(arg.entity_type).toBe(AuditEntityType.COMPLAINT);
    expect(arg.old_values).toMatchObject({ status: 'IN_PROGRESS' });
    expect(arg.new_values).toMatchObject({ status: 'RESOLVED' });
  });

  it('NoticeService.publish records PUBLISH/NOTICE with status transition', async () => {
    const audit = makeAuditMock();
    const notice = {
      id: 'n-1',
      organization_id: orgA,
      status: 'DRAFT',
      published_at: null,
    };
    const repo = {
      findOne: jest.fn(async () => notice),
      save: jest.fn(async (e: any) => e),
    };
    const dataSource = { getRepository: jest.fn(() => repo) } as any;
    const service = new NoticeService(dataSource, audit as any);

    await service.publish('n-1', { organizationId: orgA });

    expect(audit.record).toHaveBeenCalledTimes(1);
    const arg = audit.record.mock.calls[0][0];
    expect(arg.action).toBe(AuditAction.PUBLISH);
    expect(arg.entity_type).toBe(AuditEntityType.NOTICE);
    expect(arg.old_values).toMatchObject({ status: 'DRAFT' });
    expect(arg.new_values).toMatchObject({ status: 'PUBLISHED' });
  });

  it('NoticeService.archive records ARCHIVE/NOTICE', async () => {
    const audit = makeAuditMock();
    const notice = {
      id: 'n-1',
      organization_id: orgA,
      status: 'PUBLISHED',
      published_at: new Date(),
    };
    const repo = {
      findOne: jest.fn(async () => notice),
      save: jest.fn(async (e: any) => e),
    };
    const dataSource = { getRepository: jest.fn(() => repo) } as any;
    const service = new NoticeService(dataSource, audit as any);

    await service.archive('n-1', { organizationId: orgA });

    expect(audit.record).toHaveBeenCalledTimes(1);
    const arg = audit.record.mock.calls[0][0];
    expect(arg.action).toBe(AuditAction.ARCHIVE);
    expect(arg.entity_type).toBe(AuditEntityType.NOTICE);
    expect(arg.old_values).toMatchObject({ status: 'PUBLISHED' });
  });
});


describe('G/H. Poll and File behavioral wiring', () => {
  it('PollService.vote records VOTE/POLL against the poll id', async () => {
    const audit = makeAuditMock();
    const poll = {
      id: 'poll-1',
      organization_id: orgA,
      status: 'PUBLISHED',
      starts_at: new Date(Date.now() - 60_000),
      ends_at: new Date(Date.now() + 60_000),
    };
    const repos: Record<string, any> = {
      Poll: { findOne: jest.fn(async () => poll) },
      PollOption: {
        findOne: jest.fn(async () => ({
          id: 'opt-1',
          poll_id: 'poll-1',
          organization_id: orgA,
        })),
      },
      PollVote: {
        findOne: jest.fn(async () => null),
        create: jest.fn((dto: any) => ({ ...dto })),
        save: jest.fn(async (e: any) => e),
      },
      Resident: {
        findOne: jest.fn(async () => ({ id: 'res-1', organization_id: orgA })),
      },
    };
    const dataSource = {
      getRepository: jest.fn((entity: any) => {
        const key = typeof entity === 'string' ? entity : entity.name;
        return repos[key];
      }),
    } as any;
    const service = new PollService(dataSource, audit as any);

    await service.vote(
      { id: 'v-1', poll_id: 'poll-1', option_id: 'opt-1' } as any,
      'res-1',
      { organizationId: orgA },
    );

    expect(audit.record).toHaveBeenCalledTimes(1);
    const arg = audit.record.mock.calls[0][0];
    expect(arg.action).toBe(AuditAction.VOTE);
    expect(arg.entity_type).toBe(AuditEntityType.POLL);
    expect(arg.entity_id).toBe('poll-1');
    expect(arg.target_organization_id).toBe(orgA);
    expect(arg.new_values).toMatchObject({ poll_id: 'poll-1' });
  });

  it('FileService.upload records UPLOAD/FILE and remove records DELETE/FILE', async () => {
    const audit = makeAuditMock();
    const stored = { key: 'k', sizeBytes: 4, provider: 'local' };
    const repo = {
      create: jest.fn((dto: any) => ({ ...dto })),
      save: jest.fn(async (e: any) => e),
      findOne: jest.fn(async () => ({
        id: 'file-1',
        organization_id: orgA,
        uploaded_by: 'user-1',
        is_active: true,
      })),
    };
    const dataSource = { getRepository: jest.fn(() => repo) } as any;
    const storageProvider = { store: jest.fn(async () => stored) } as any;
    const service = new FileService(dataSource, storageProvider, audit as any);

    await service.upload(
      orgA,
      'user-1',
      'a.txt',
      'text/plain',
      Buffer.from('x'),
    );
    expect(audit.record).toHaveBeenCalledTimes(1);
    let arg = audit.record.mock.calls[0][0];
    expect(arg.action).toBe(AuditAction.UPLOAD);
    expect(arg.entity_type).toBe(AuditEntityType.FILE);
    expect(arg.actor_user_id).toBe('user-1');
    expect(arg.target_organization_id).toBe(orgA);

    await service.remove('file-1', orgA, 'user-1');
    expect(audit.record).toHaveBeenCalledTimes(2);
    arg = audit.record.mock.calls[1][0];
    expect(arg.action).toBe(AuditAction.DELETE);
    expect(arg.entity_type).toBe(AuditEntityType.FILE);
    expect(arg.old_values).toMatchObject({ is_active: true });
    expect(arg.new_values).toBeNull();
  });

  it('H. FileService.remove succeeds even when the audit write fails', async () => {
    const audit = { record: jest.fn().mockRejectedValue(new Error('db down')) };
    const repo = {
      findOne: jest.fn(async () => ({
        id: 'file-1',
        organization_id: orgA,
        uploaded_by: 'user-1',
        is_active: true,
      })),
      save: jest.fn(async (e: any) => e),
    };
    const dataSource = { getRepository: jest.fn(() => repo) } as any;
    const service = new FileService(
      dataSource,
      { store: jest.fn() } as any,
      audit as any,
    );

    await expect(
      service.remove('file-1', orgA, 'user-1'),
    ).resolves.toBeUndefined();
    expect(audit.record).toHaveBeenCalledTimes(1);
  });
});


describe('J. audit context helpers', () => {
  it('resolveAuditContext resolves a normal organization member', () => {
    const ctx = resolveAuditContext({
      orgContext: { userId: 'u1', organizationId: orgA, isSuperAdmin: false },
      entityOrganizationId: 'other-org',
    });
    expect(ctx).toEqual({
      actor_user_id: 'u1',
      actor_organization_id: orgA,
      target_organization_id: orgA,
    });
  });

  it('resolveAuditContext treats SUPER_ADMIN as platform-scoped', () => {
    const ctx = resolveAuditContext({
      orgContext: {
        userId: 'super',
        organizationId: null,
        isSuperAdmin: true,
        targetOrganizationId: 'target-org',
      },
      entityOrganizationId: 'entity-org',
    });
    expect(ctx).toEqual({
      actor_user_id: 'super',
      actor_organization_id: null,
      target_organization_id: 'target-org',
    });
  });

  it('resolveAuditContext falls back to the entity organization when unresolved', () => {
    const ctx = resolveAuditContext({ entityOrganizationId: 'entity-org' });
    expect(ctx.target_organization_id).toBe('entity-org');
    expect(ctx.actor_organization_id).toBeNull();
  });

  it('toSnapshot copies the entity and never returns primitives', () => {
    const entity = { id: 'x', name: 'y' };
    const snapshot = toSnapshot(entity)!;
    expect(snapshot).toEqual(entity);
    expect(snapshot).not.toBe(entity);
    expect(toSnapshot(null)).toBeNull();
    expect(toSnapshot(undefined)).toBeNull();
    expect(toSnapshot('str' as unknown)).toBeNull();
  });

  it('extractRequestMeta reads ip and user-agent best effort', () => {
    expect(
      extractRequestMeta({
        headers: {
          'x-forwarded-for': '1.2.3.4, 5.6.7.8',
          'user-agent': 'jest-agent',
        },
      }),
    ).toEqual({ ip_address: '1.2.3.4', user_agent: 'jest-agent' });
    expect(extractRequestMeta(undefined)).toEqual({
      ip_address: null,
      user_agent: null,
    });
  });
});

