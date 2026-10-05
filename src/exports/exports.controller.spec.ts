// The controller (via AuthGuard) imports @nestjs/jwt, which is ESM-only.
jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {},
}));

import * as fs from 'fs';
import * as path from 'path';
import { ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrganizationGuard } from '../organization/organization.guard';
import { ExportAuthorizationGuard } from './exports.guard';
import { ExportsController } from './exports.controller';
import { REQUIRED_PERMISSION_KEY } from '../authorization/require-permission.decorator';

const orgId = 'org-aaaa-0001';
const otherOrgId = 'org-bbbb-0002';

const ROUTES = [
  ['exportResidents', 'residents'],
  ['exportVisitors', 'visitors'],
  ['exportMaintenanceDues', 'maintenance-dues'],
  ['exportPayments', 'payments'],
  ['exportComplaints', 'complaints'],
  ['exportNotices', 'notices'],
  ['exportPolls', 'polls'],
] as const;

const SERVICE_METHODS = [
  'exportResidents',
  'exportVisitors',
  'exportMaintenanceDues',
  'exportPayments',
  'exportComplaints',
  'exportNotices',
  'exportPolls',
];

function build() {
  const service: any = {};
  for (const method of SERVICE_METHODS) {
    service[method] = jest.fn().mockResolvedValue({
      filename: 'x.csv',
      csv: 'a,b\r\n1,2\r\n',
      truncated: false,
      rowCount: 1,
    });
  }
  const controller = new ExportsController(service);
  const res: any = {
    setHeader: jest.fn(),
    send: jest.fn(),
  };
  return { controller, service, res };
}

describe('ExportsController (Phase 10 Step 4)', () => {
  describe('routes', () => {
    it('exposes exactly the 7 approved export GET routes', () => {
      const proto = ExportsController.prototype as any;
      for (const [handler, path] of ROUTES) {
        expect(Reflect.getMetadata('path', proto[handler])).toBe(path);
        expect(Reflect.getMetadata('method', proto[handler])).toBe(0); // GET
        expect(
          Reflect.getMetadata(REQUIRED_PERMISSION_KEY, proto[handler]),
        ).toBe('report:export');
      }
    });

    it('has no occupancy or audit-log export endpoint', () => {
      const proto = ExportsController.prototype as any;
      expect(proto.exportOccupancy).toBeUndefined();
      expect(proto.exportAuditLogs).toBeUndefined();
      expect(proto.exportAudits).toBeUndefined();

      const handlers = Object.getOwnPropertyNames(proto).filter(
        (name) =>
          name !== 'constructor' &&
          name !== 'send' &&
          name !== 'resolveOrganizationId' &&
          typeof proto[name] === 'function',
      );
      expect(handlers.sort()).toEqual(ROUTES.map(([h]) => h).sort());
    });

    it('registers AuthGuard + OrganizationGuard + export authorization', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        ExportsController,
      ) as any[];
      expect(guards).toContain(AuthGuard);
      expect(guards).toContain(OrganizationGuard);
      expect(guards).toContain(ExportAuthorizationGuard);
    });

    it('exposes no mutation endpoints and no queue/async infrastructure', () => {
      const proto = ExportsController.prototype as any;
      for (const forbidden of [
        'create',
        'update',
        'remove',
        'delete',
        'schedule',
        'download',
      ]) {
        expect(proto[forbidden]).toBeUndefined();
      }
      const code = fs
        .readFileSync(path.join(__dirname, 'exports.controller.ts'), 'utf8')
        .split('\n')
        .filter((line) => {
          const t = line.trim();
          return !t.startsWith('*') && !t.startsWith('//');
        })
        .join('\n');
      expect(code).not.toMatch(/@Post|@Put|@Patch|@Delete/);
      expect(code).not.toMatch(/bull|queue|@Cron|Scheduler|EventEmitter/);
      expect(code).not.toMatch(/xlsx|pdf|excel/i);
    });
  });

  describe('organization isolation', () => {
    it.each(ROUTES)('%s uses the resolved organization', async (handler) => {
      const { controller, service, res } = build();
      await controller[handler]({ orgContext: { organizationId: orgId } }, {}, res);
      expect(service[handler]).toHaveBeenCalledTimes(1);
      expect(service[handler].mock.calls[0][0]).toBe(orgId);
    });

    it.each(ROUTES)(
      '%s ignores a query organization_id',
      async (handler) => {
        const { controller, service, res } = build();
        await controller[handler](
          { orgContext: { organizationId: orgId } },
          { organization_id: otherOrgId },
          res,
        );
        expect(service[handler].mock.calls[0][0]).toBe(orgId);
      },
    );

    it.each(ROUTES)(
      '%s honours the SUPER_ADMIN target organization',
      async (handler) => {
        const { controller, service, res } = build();
        await controller[handler](
          {
            orgContext: {
              organizationId: orgId,
              targetOrganizationId: orgId,
              isSuperAdmin: true,
            },
          },
          {},
          res,
        );
        expect(service[handler].mock.calls[0][0]).toBe(orgId);
      },
    );

    it.each(ROUTES)(
      '%s throws without an organization context',
      async (handler) => {
        const { controller, res } = build();
        await expect(
          controller[handler]({ orgContext: {} }, {}, res),
        ).rejects.toThrow(ForbiddenException);
      },
    );
  });

  describe('response headers', () => {
    it.each(ROUTES)('%s sends CSV headers with attachment filename', async (handler) => {
      const { controller, service, res } = build();
      const filename = `${handler.replace('export', '').toLowerCase()}.csv`;
      service[handler].mockResolvedValue({
        filename,
        csv: 'a\r\n1\r\n',
        truncated: false,
        rowCount: 1,
      });

      await controller[handler]({ orgContext: { organizationId: orgId } }, {}, res);

      const headers: Record<string, any> = {};
      for (const call of res.setHeader.mock.calls) {
        headers[call[0]] = call[1];
      }
      expect(headers['Content-Type']).toBe('text/csv; charset=utf-8');
      expect(headers['Content-Disposition']).toBe(
        `attachment; filename="${filename}"`,
      );
      expect(headers['X-Export-Truncated']).toBe('false');
      expect(res.send).toHaveBeenCalledWith('a\r\n1\r\n');
    });

    it('marks truncated exports with X-Export-Truncated: true', async () => {
      const { controller, service, res } = build();
      service.exportNotices.mockResolvedValue({
        filename: 'notices.csv',
        csv: 'a\r\n',
        truncated: true,
        rowCount: 5000,
      });

      await controller.exportNotices({ orgContext: { organizationId: orgId } }, {}, res);

      const headers: Record<string, any> = {};
      for (const call of res.setHeader.mock.calls) {
        headers[call[0]] = call[1];
      }
      expect(headers['X-Export-Truncated']).toBe('true');
      expect(headers['Content-Disposition']).toBe(
        'attachment; filename="notices.csv"',
      );
    });
  });

  describe('exports are read-only', () => {
    it('never touches the audit module', () => {
      for (const file of ['exports.controller.ts', 'exports.service.ts']) {
        const code = fs
          .readFileSync(path.join(__dirname, file), 'utf8')
          .split('\n')
          .filter((line) => {
            const t = line.trim();
            return !t.startsWith('*') && !t.startsWith('//');
          })
          .join('\n');
        expect(code).not.toMatch(/AuditService|recordAudit|AuditLog|record\(/);
      }
    });
  });
});
