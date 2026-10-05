/**
 * Phase 10 Step 4 integration: ExportsService wired to the REAL
 * ReportsService over a mocked DataSource — verifies the shared query path
 * (org scoping, filters, deterministic ordering, fetch-one-extra bound,
 * from > to -> 400) that the 7 CSV exports actually execute.
 */
import { BadRequestException } from '@nestjs/common';
import { ExportsService } from './exports.service';
import { EXPORT_MAX_ROWS } from './exports.types';
import { ReportsService } from '../reports/reports.service';

const orgId = 'org-aaaa-0001';
const otherOrgId = 'org-bbbb-0002';

function makeDataSource() {
  const builders: any[] = [];
  const writes = {
    save: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
  };

  const chain = [
    'where',
    'andWhere',
    'orWhere',
    'leftJoin',
    'leftJoinAndSelect',
    'innerJoin',
    'innerJoinAndSelect',
    'select',
    'addSelect',
    'groupBy',
    'addGroupBy',
    'orderBy',
    'addOrderBy',
    'skip',
    'take',
    'distinct',
  ];

  const dataSource: any = {
    getRepository: jest.fn(() => {
      const qb: any = {};
      for (const method of chain) {
        qb[method] = jest.fn().mockReturnValue(qb);
      }
      qb.getManyAndCount = jest.fn(async () => [[], 0]);
      qb.getMany = jest.fn(async () => []);
      qb.getRawMany = jest.fn(async () => []);
      builders.push(qb);
      return { createQueryBuilder: jest.fn(() => qb), ...writes };
    }),
    ...writes,
  };

  return { dataSource, builders, writes };
}

function conditionCalls(qb: any): [string, any][] {
  return [...(qb.where?.mock?.calls ?? []), ...(qb.andWhere?.mock?.calls ?? [])].filter(
    (call) => typeof call[0] === 'string',
  );
}

function isOrgScoped(qb: any, organizationId: string): boolean {
  return conditionCalls(qb).some(
    ([sql, params]) =>
      sql.includes(':organizationId') &&
      params &&
      params.organizationId === organizationId,
  );
}

type ExportCall = [
  string,
  (service: ExportsService, filters?: any) => Promise<any>,
];

const DATE_RANGED = [
  ['visitors', (s: ExportsService, f?: any) => s.exportVisitors(orgId, f)],
  ['maintenance-dues', (s: ExportsService, f?: any) => s.exportMaintenanceDues(orgId, f)],
  ['payments', (s: ExportsService, f?: any) => s.exportPayments(orgId, f)],
  ['complaints', (s: ExportsService, f?: any) => s.exportComplaints(orgId, f)],
  ['notices', (s: ExportsService, f?: any) => s.exportNotices(orgId, f)],
  ['polls', (s: ExportsService, f?: any) => s.exportPolls(orgId, f)],
] as ExportCall[];

const ALL_EXPORTS: ExportCall[] = [
  ['residents', (s: ExportsService, f?: any) => s.exportResidents(orgId, f)],
  ...DATE_RANGED,
];

function build() {
  const { dataSource, builders, writes } = makeDataSource();
  const reports = new ReportsService(dataSource);
  return { service: new ExportsService(reports), builders, writes };
}

describe('ExportsService x real ReportsService (Phase 10 Step 4)', () => {
  describe('organization isolation', () => {
    it.each(ALL_EXPORTS)('%s scopes the shared query by the resolved org', async (name, call) => {
      const { service, builders } = build();
      await call(service);

      expect(builders.length).toBeGreaterThan(0);
      for (const qb of builders) {
        expect(isOrgScoped(qb, orgId)).toBe(true);
      }
    });

    it('never lets a client supplied organization_id widen the scope', async () => {
      const { service, builders } = build();
      await service.exportPayments(orgId, {
        organization_id: otherOrgId,
        flat_id: '11111111-1111-1111-1111-111111111111',
      } as any);

      for (const qb of builders) {
        expect(isOrgScoped(qb, orgId)).toBe(true);
        for (const [, params] of conditionCalls(qb)) {
          if (params && typeof params === 'object') {
            expect(JSON.stringify(params)).not.toContain(otherOrgId);
          }
        }
      }
    });
  });

  describe('date validation (shared resolveDateRange)', () => {
    it.each(DATE_RANGED)('%s rejects from > to with 400', async (name, call) => {
      const { service } = build();
      await expect(
        call(service, { from: '2026-06-01', to: '2026-01-01' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an invalid from/to value with 400', async () => {
      const { service } = build();
      await expect(
        service.exportNotices(orgId, { from: '01-01-2026' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deterministic ordering and bound', () => {
    it.each(ALL_EXPORTS)('%s orders DESC/DESC and fetches maxRows + 1', async (name, call) => {
      const { service, builders } = build();
      const result = await call(service);

      const main = builders[0];
      expect(main.orderBy).toHaveBeenCalledWith(expect.any(String), 'DESC');
      expect(main.addOrderBy).toHaveBeenCalledWith(expect.any(String), 'DESC');
      expect(main.take).toHaveBeenCalledWith(EXPORT_MAX_ROWS + 1);
      expect(result.truncated).toBe(false);
      expect(result.rowCount).toBe(0);
    });
  });

  describe('filter propagation', () => {
    it('applies resident kyc_status to the shared query', async () => {
      const { service, builders } = build();
      await service.exportResidents(orgId, { kyc_status: 'VERIFIED' } as any);

      const sql = conditionCalls(builders[0])
        .map(([condition]) => condition)
        .join(' | ');
      expect(sql).toContain('kyc_status');
    });

    it('applies payment_status to the shared query', async () => {
      const { service, builders } = build();
      await service.exportPayments(orgId, { payment_status: 'COMPLETED' } as any);

      const sql = conditionCalls(builders[0])
        .map(([condition]) => condition)
        .join(' | ');
      expect(sql).toContain('payment.payment_status = :paymentStatus');
    });

    it('applies an inclusive date range to the shared query', async () => {
      const { service, builders } = build();
      await service.exportPayments(orgId, {
        from: '2026-01-01',
        to: '2026-01-31',
      } as any);

      const sql = conditionCalls(builders[0])
        .map(([condition]) => condition)
        .join(' | ');
      expect(sql).toContain('payment.payment_date >= :from');
      expect(sql).toContain('payment.payment_date <= :to');
    });
  });

  describe('read-only guarantee', () => {
    it.each(ALL_EXPORTS)('%s never calls a write method', async (name, call) => {
      const { service, writes } = build();
      await call(service);

      expect(writes.save).not.toHaveBeenCalled();
      expect(writes.insert).not.toHaveBeenCalled();
      expect(writes.update).not.toHaveBeenCalled();
      expect(writes.delete).not.toHaveBeenCalled();
      expect(writes.remove).not.toHaveBeenCalled();
    });
  });

  describe('empty organization', () => {
    it.each(ALL_EXPORTS)('%s returns a header-only CSV', async (name, call) => {
      const { service } = build();
      const result = await call(service);

      expect(result.rowCount).toBe(0);
      expect(result.truncated).toBe(false);
      const lines = result.csv.replace(/\r\n$/u, '').split('\r\n');
      expect(lines).toHaveLength(1);
      expect(lines[0].length).toBeGreaterThan(0);
      expect(result.filename).toMatch(/\.csv$/u);
    });
  });
});
