// The controller (via AuthGuard) imports @nestjs/jwt, which is ESM-only. Stub
// it so this focused unit spec can load the controller under ts-jest (CJS).
jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {},
}));

import * as fs from 'fs';
import * as path from 'path';
import { ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrganizationGuard } from '../organization/organization.guard';
import { ReportAuthorizationGuard } from './reports.guard';
import { ReportsController } from './reports.controller';
import { REQUIRED_PERMISSION_KEY } from '../authorization/require-permission.decorator';

const orgId = 'org-aaaa-0001';
const otherOrgId = 'org-bbbb-0002';

const HANDLERS = [
  'getOccupancy',
  'getResidents',
  'getVisitors',
  'getMaintenanceDues',
  'getPayments',
  'getComplaints',
  'getNotices',
  'getPolls',
] as const;

function build() {
  const service: any = {};
  for (const handler of HANDLERS) {
    service[handler] = jest.fn().mockResolvedValue({ items: [], total: 0 });
  }
  const controller = new ReportsController(service);
  return { controller, service };
}

describe('ReportsController (Phase 10 Step 3)', () => {
  describe('routes', () => {
    it('exposes exactly the 8 approved report GET routes', () => {
      const expected: Record<string, string> = {
        getOccupancy: 'occupancy',
        getResidents: 'residents',
        getVisitors: 'visitors',
        getMaintenanceDues: 'maintenance-dues',
        getPayments: 'payments',
        getComplaints: 'complaints',
        getNotices: 'notices',
        getPolls: 'polls',
      };

      const proto = ReportsController.prototype as any;
      for (const handler of HANDLERS) {
        expect(Reflect.getMetadata('path', proto[handler])).toBe(
          expected[handler],
        );
        // RequestMethod.GET === 0
        expect(Reflect.getMetadata('method', proto[handler])).toBe(0);
        expect(
          Reflect.getMetadata(REQUIRED_PERMISSION_KEY, proto[handler]),
        ).toBe('report:read');
      }

      const routeHandlers = Object.getOwnPropertyNames(proto).filter(
        (name) =>
          name !== 'constructor' &&
          name !== 'resolveOrganizationId' &&
          typeof proto[name] === 'function',
      );
      expect(routeHandlers.sort()).toEqual([...HANDLERS].sort());
    });

    it('registers AuthGuard + OrganizationGuard + report authorization', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        ReportsController,
      ) as any[];
      expect(guards).toContain(AuthGuard);
      expect(guards).toContain(OrganizationGuard);
      expect(guards).toContain(ReportAuthorizationGuard);
    });

    it('exposes no mutation or export endpoints', () => {
      const proto = ReportsController.prototype as any;
      for (const forbidden of [
        'create',
        'update',
        'remove',
        'delete',
        'save',
        'export',
        'exportCsv',
        'download',
      ]) {
        expect(proto[forbidden]).toBeUndefined();
      }
      const source = fs.readFileSync(
        path.join(__dirname, 'reports.controller.ts'),
        'utf8',
      );
      const code = source
        .split('\n')
        .filter((line) => {
          const trimmed = line.trim();
          return !trimmed.startsWith('*') && !trimmed.startsWith('//');
        })
        .join('\n');
      expect(code).not.toMatch(/@Post|@Put|@Patch|@Delete/);
      expect(code).not.toMatch(/csv/i);
    });
  });

  describe('organization isolation', () => {
    it.each(HANDLERS)(
      '%s uses the resolved organization from orgContext',
      async (handler) => {
        const { controller, service } = build();
        const req = { orgContext: { organizationId: orgId } };

        await controller[handler](req, {});

        expect(service[handler]).toHaveBeenCalledTimes(1);
        expect(service[handler].mock.calls[0][0]).toBe(orgId);
      },
    );

    it.each(HANDLERS)(
      '%s ignores a query organization_id (cannot override scope)',
      async (handler) => {
        const { controller, service } = build();
        const req = { orgContext: { organizationId: orgId } };

        await controller[handler](req, { organization_id: otherOrgId });

        expect(service[handler].mock.calls[0][0]).toBe(orgId);
      },
    );

    it.each(HANDLERS)(
      '%s reads the SUPER_ADMIN target organization',
      async (handler) => {
        const { controller, service } = build();
        const req = {
          orgContext: {
            organizationId: orgId,
            targetOrganizationId: orgId,
            isSuperAdmin: true,
          },
        };

        await controller[handler](req, { organization_id: otherOrgId });

        expect(service[handler].mock.calls[0][0]).toBe(orgId);
      },
    );

    it.each(HANDLERS)(
      '%s throws when organization context is missing (SUPER_ADMIN without X-Organization-Id)',
      async (handler) => {
        const { controller } = build();
        await expect(controller[handler]({ orgContext: {} }, {})).rejects.toThrow(
          ForbiddenException,
        );
      },
    );
  });

  describe('reports are read-only', () => {
    it('never touches the audit module', () => {
      for (const file of ['reports.controller.ts', 'reports.service.ts']) {
        const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
        const code = source
          .split('\n')
          .filter((line) => {
            const trimmed = line.trim();
            return !trimmed.startsWith('*') && !trimmed.startsWith('//');
          })
          .join('\n');
        expect(code).not.toMatch(/AuditService|recordAudit|AuditLog|record\(/);
      }
    });
  });
});
