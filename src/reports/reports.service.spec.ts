import * as fs from 'fs';
import * as path from 'path';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { REPORT_MAX_PAGE_SIZE } from './reports.dto';

const orgId = 'org-aaaa-0001';
const otherOrgId = 'org-bbbb-0002';

type Responses = {
  getManyAndCount?: any[][];
  getMany?: any[][];
  getRawMany?: any[][];
};

/** Chainable query-builder mock; responses are consumed in query order. */
function makeDataSource(responses: Responses = {}) {
  const state: Responses = {
    getManyAndCount: [...(responses.getManyAndCount ?? [])],
    getMany: [...(responses.getMany ?? [])],
    getRawMany: [...(responses.getRawMany ?? [])],
  };
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
      qb.getManyAndCount = jest.fn(async () => state.getManyAndCount.shift() ?? [[], 0]);
      qb.getMany = jest.fn(async () => state.getMany.shift() ?? []);
      qb.getRawMany = jest.fn(async () => state.getRawMany.shift() ?? []);
      builders.push(qb);
      return { createQueryBuilder: jest.fn(() => qb), ...writes };
    }),
    ...writes,
  };

  return { dataSource, builders, writes };
}

function conditionCalls(qb: any): { sql: string; params: any }[] {
  return [
    ...(qb.where?.mock?.calls ?? []),
    ...(qb.andWhere?.mock?.calls ?? []),
  ].filter((call) => typeof call[0] === 'string');
}

function isOrgScoped(qb: any, organizationId: string): boolean {
  return conditionCalls(qb).some(
    ([sql, params]) =>
      sql.includes(':organizationId') &&
      params &&
      params.organizationId === organizationId,
  );
}

function allParams(qb: any): any[] {
  return conditionCalls(qb).map(([, params]) => params).filter(Boolean);
}

const REPORT_CALLS: [string, (service: ReportsService) => Promise<unknown>][] = [
  ['occupancy', (s) => s.getOccupancy(orgId)],
  ['residents', (s) => s.getResidents(orgId)],
  ['visitors', (s) => s.getVisitors(orgId)],
  ['maintenance-dues', (s) => s.getMaintenanceDues(orgId)],
  ['payments', (s) => s.getPayments(orgId)],
  ['complaints', (s) => s.getComplaints(orgId)],
  ['notices', (s) => s.getNotices(orgId)],
  ['polls', (s) => s.getPolls(orgId)],
];

describe('ReportsService (Phase 10 Step 3)', () => {
  describe('organization isolation', () => {
    it.each(REPORT_CALLS)(
      '%s scopes every query by the resolved organization',
      async (_name, call) => {
        const { dataSource, builders } = makeDataSource();
        const service = new ReportsService(dataSource);

        await call(service);

        expect(builders.length).toBeGreaterThan(0);
        for (const qb of builders) {
          expect(isOrgScoped(qb, orgId)).toBe(true);
        }
      },
    );

    it('never lets a client supplied organization_id override the scope', async () => {
      const { dataSource, builders } = makeDataSource();
      const service = new ReportsService(dataSource);

      await service.getResidents(orgId, {
        organization_id: otherOrgId,
        flat_id: '11111111-1111-1111-1111-111111111111',
      } as any);

      for (const qb of builders) {
        expect(isOrgScoped(qb, orgId)).toBe(true);
        const params = allParams(qb);
        for (const param of params) {
          expect(param.organizationId).not.toBe(otherOrgId);
        }
        expect(JSON.stringify(params)).not.toContain(otherOrgId);
      }
    });

    it.each([
      ['occupancy', (s: ReportsService) => s.getOccupancy('')],
      ['residents', (s: ReportsService) => s.getResidents('')],
      ['visitors', (s: ReportsService) => s.getVisitors('')],
      ['maintenance-dues', (s: ReportsService) => s.getMaintenanceDues('')],
      ['payments', (s: ReportsService) => s.getPayments('')],
      ['complaints', (s: ReportsService) => s.getComplaints('')],
      ['notices', (s: ReportsService) => s.getNotices('')],
      ['polls', (s: ReportsService) => s.getPolls('')],
    ])('%s refuses to run without an organization context', async (name, call) => {
      const { dataSource, builders } = makeDataSource();
      const service = new ReportsService(dataSource);

      await expect(call(service)).rejects.toThrow(ForbiddenException);
      expect(builders).toHaveLength(0);
    });

    it.each(REPORT_CALLS)(
      '%s returns empty results for an empty organization',
      async (name, call) => {
        const { dataSource } = makeDataSource();
        const service = new ReportsService(dataSource);

        const result: any = await call(service);

        if (name === 'occupancy') {
          expect(result).toEqual({
            buildings: [],
            totals: {
              buildings: 0,
              floors: 0,
              total_flats: 0,
              occupied_flats: 0,
              vacant_flats: 0,
              occupancy_percentage: 0,
            },
          });
        } else {
          expect(result).toEqual({
            items: [],
            total: 0,
            page: 1,
            limit: 25,
            totalPages: 0,
          });
        }
      },
    );
  });

  describe('date validation', () => {
    it('rejects an invalid from/to value', async () => {
      const { dataSource } = makeDataSource();
      const service = new ReportsService(dataSource);

      await expect(
        service.getVisitors(orgId, { from: '01-01-2026' } as any),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.getPayments(orgId, { to: 'not-a-date' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects from > to with 400', async () => {
      const { dataSource } = makeDataSource();
      const service = new ReportsService(dataSource);

      await expect(
        service.getPayments(orgId, {
          from: '2026-06-01',
          to: '2026-01-01',
        } as any),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.getMaintenanceDues(orgId, {
          from: '2026-06-01T00:00:00.000Z',
          to: '2026-05-31T00:00:00.000Z',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('applies a valid inclusive date range to the query', async () => {
      const { dataSource, builders } = makeDataSource();
      const service = new ReportsService(dataSource);

      await service.getPayments(orgId, {
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

  describe('filter validation', () => {
    it('accepts exactly the approved notice statuses', async () => {
      const { dataSource } = makeDataSource();
      const service = new ReportsService(dataSource);
      for (const status of ['DRAFT', 'PUBLISHED', 'ARCHIVED']) {
        await expect(service.getNotices(orgId, { status } as any)).resolves
          .toBeDefined();
      }
    });

    it('rejects EXPIRED as a notice status', async () => {
      const { dataSource } = makeDataSource();
      const service = new ReportsService(dataSource);
      await expect(
        service.getNotices(orgId, { status: 'EXPIRED' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepts exactly the approved poll statuses', async () => {
      const { dataSource } = makeDataSource();
      const service = new ReportsService(dataSource);
      for (const status of ['DRAFT', 'PUBLISHED', 'CLOSED']) {
        await expect(service.getPolls(orgId, { status } as any)).resolves.toBeDefined();
      }
      await expect(
        service.getPolls(orgId, { status: 'ARCHIVED' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects unknown enum, boolean and billing period filters', async () => {
      const { dataSource } = makeDataSource();
      const service = new ReportsService(dataSource);

      await expect(
        service.getResidents(orgId, { kyc_status: 'APPROVED' } as any),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.getResidents(orgId, { app_access: 'yes' } as any),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.getVisitors(orgId, { visit_status: 'ARRIVED' } as any),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.getMaintenanceDues(orgId, { status: 'LATE' } as any),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.getMaintenanceDues(orgId, { billing_period: '2026-13' } as any),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.getPayments(orgId, { payment_status: 'PARTIAL' } as any),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.getPayments(orgId, { payment_method: 'BTC' } as any),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.getComplaints(orgId, { priority: 'CRITICAL' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('pagination', () => {
    it('applies server-side pagination', async () => {
      const { dataSource, builders } = makeDataSource();
      const service = new ReportsService(dataSource);

      const page = await service.getResidents(orgId, { page: 2, limit: 10 } as any);

      expect(builders[0].skip).toHaveBeenCalledWith(10);
      expect(builders[0].take).toHaveBeenCalledWith(10);
      expect(page).toMatchObject({ total: 0, page: 2, limit: 10, totalPages: 0 });
    });

    it('bounds the limit defensively', async () => {
      const { dataSource, builders } = makeDataSource();
      const service = new ReportsService(dataSource);

      await service.getResidents(orgId, { page: 1, limit: 100000 } as any);

      expect(builders[0].take).toHaveBeenCalledWith(REPORT_MAX_PAGE_SIZE);
    });
  });

  describe('occupancy aggregation', () => {
    it('aggregates buildings / floors / flats and counts a flat once', async () => {
      const { dataSource, builders } = makeDataSource({
        getMany: [
          [
            { id: 'b-1', name: 'Tower A', code: 'TA', isActive: true },
            { id: 'b-2', name: 'Tower B', code: null, isActive: false },
          ],
        ],
        getRawMany: [
          [
            { building_id: 'b-1', floor_count: '3' },
            { building_id: 'b-2', floor_count: '2' },
          ],
          [
            { building_id: 'b-1', total_flats: '10', occupied_flats: '7' },
            { building_id: 'b-2', total_flats: '4', occupied_flats: '0' },
          ],
        ],
      });
      const service = new ReportsService(dataSource);

      const result = await service.getOccupancy(orgId);

      expect(result.buildings[0]).toEqual({
        id: 'b-1',
        name: 'Tower A',
        code: 'TA',
        is_active: true,
        floors: 3,
        total_flats: 10,
        occupied_flats: 7,
        vacant_flats: 3,
        occupancy_percentage: 70,
      });
      expect(result.buildings[1].occupancy_percentage).toBe(0);
      expect(result.totals).toEqual({
        buildings: 2,
        floors: 5,
        total_flats: 14,
        occupied_flats: 7,
        vacant_flats: 7,
        occupancy_percentage: 50,
      });

      const flatSelects = builders[2].addSelect.mock.calls.map((c) => c[0]);
      expect(
        flatSelects.some((sql) => String(sql).includes('DISTINCT')),
      ).toBe(true);
      expect(
        builders[2].leftJoin.mock.calls[0][2],
      ).toContain('occupied.isActive = true');
    });
  });

  describe('sensitive data handling', () => {
    it('resident report exposes report-safe fields only (no mobileNumber/auth)', async () => {
      const { dataSource, builders } = makeDataSource({
        getManyAndCount: [
          [
            [
              {
                id: 'res-1',
                organization_id: orgId,
                flat_id: 'flat-1',
                kyc_status: 'VERIFIED',
                app_access_status: true,
                isActive: true,
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                updatedAt: new Date('2026-01-02T00:00:00.000Z'),
                flat: {
                  id: 'flat-1',
                  flat_identifier: 'A-101',
                  building_id: 'b-1',
                  floor_id: 'f-1',
                  building: { id: 'b-1', name: 'Tower A' },
                  floor: { id: 'f-1', floor_number: 3 },
                },
                // fields that must never leak:
                user: {
                  id: 'user-1',
                  mobileNumber: '+919999999999',
                  refreshTokenId: 'refresh-secret',
                  isAuthenticated: true,
                },
                mobileNumber: '+919999999999',
                password: 'hash',
                otp: '123456',
              },
            ],
            1,
          ],
        ],
      });
      const service = new ReportsService(dataSource);

      const result = await service.getResidents(orgId);

      expect(Object.keys(result.items[0]).sort()).toEqual([
        'app_access_status',
        'building',
        'created_at',
        'flat',
        'floor',
        'is_active',
        'kyc_status',
        'resident_id',
        'updated_at',
      ]);
      expect(result.items[0]).toMatchObject({
        resident_id: 'res-1',
        kyc_status: 'VERIFIED',
        app_access_status: true,
        is_active: true,
        flat: { id: 'flat-1', flat_identifier: 'A-101' },
        building: { id: 'b-1', name: 'Tower A' },
        floor: { id: 'f-1', floor_number: 3 },
      });

      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain('9999999999');
      expect(serialized).not.toContain('mobileNumber');
      expect(serialized).not.toContain('refreshTokenId');
      expect(serialized).not.toContain('password');
      expect(serialized).not.toContain('otp');

      // the User relation is never joined
      const joins = builders[0].leftJoinAndSelect.mock.calls.map((c) =>
        String(c[0]),
      );
      expect(joins.some((join) => join.includes('user'))).toBe(false);
    });

    it('visitor report may expose visitor.mobile but never auth secrets', async () => {
      const { dataSource } = makeDataSource({
        getManyAndCount: [
          [
            [
              {
                id: 'visit-1',
                organization_id: orgId,
                visitor_id: 'v-1',
                visit_status: 'CONFIRMED',
                visit_purpose: 'Meeting',
                expected_entry_time: new Date('2026-02-01T09:00:00.000Z'),
                actual_entry_time: null,
                createdAt: new Date('2026-02-01T08:00:00.000Z'),
                updatedAt: new Date('2026-02-01T08:00:00.000Z'),
                visitor: {
                  id: 'v-1',
                  name: 'Ravi Kumar',
                  mobile: '+919812345678',
                  fcmToken: 'fcm-secret',
                  otp: '999999',
                },
              },
            ],
            1,
          ],
        ],
        getMany: [
          [
            {
              visitor_visit_id: 'visit-1',
              organization_id: orgId,
              approval_status: 'APPROVED',
            },
          ],
          [
            {
              visitor_visit_id: 'visit-1',
              organization_id: orgId,
              pass_status: 'ACTIVE',
            },
          ],
        ],
      });
      const service = new ReportsService(dataSource);

      const result = await service.getVisitors(orgId);

      expect(result.items[0]).toMatchObject({
        visit_id: 'visit-1',
        visitor: { id: 'v-1', name: 'Ravi Kumar', mobile: '+919812345678' },
        visit_status: 'CONFIRMED',
        approval_status: 'APPROVED',
        pass_status: 'ACTIVE',
      });
      const serialized = JSON.stringify(result);
      expect(serialized).toContain('+919812345678');
      expect(serialized).not.toContain('fcmToken');
      expect(serialized).not.toContain('otp');
      expect(serialized).not.toContain('fcm-secret');
    });

    it('maintenance dues report uses persisted snapshot fields', async () => {
      const { dataSource } = makeDataSource({
        getManyAndCount: [
          [
            [
              {
                id: 'due-1',
                organization_id: orgId,
                flat_id: 'flat-1',
                status: 'OVERDUE',
                billing_period_start: '2026-01-01',
                billing_period_end: '2026-01-31',
                calculated_amount: '2500.00',
                late_charge: '100.00',
                late_charge_waived: '100.00',
                late_charge_waived_at: new Date('2026-02-02T00:00:00.000Z'),
                due_date: '2026-02-05',
                payment_received_at: null,
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                flat: {
                  id: 'flat-1',
                  flat_identifier: 'A-101',
                  building_id: 'b-1',
                  building: { id: 'b-1', name: 'Tower A' },
                },
              },
            ],
            1,
          ],
        ],
      });
      const service = new ReportsService(dataSource);

      const result = await service.getMaintenanceDues(orgId);

      expect(result.items[0]).toMatchObject({
        due_id: 'due-1',
        status: 'OVERDUE',
        flat: { id: 'flat-1', flat_identifier: 'A-101' },
        building: { id: 'b-1', name: 'Tower A' },
        calculated_amount: '2500.00',
        late_charge: '100.00',
        late_charge_waived: '100.00',
        is_late_charge_waived: true,
        due_date: '2026-02-05',
        payment_received_at: null,
      });
    });
  });

  describe('poll results are aggregates only', () => {
    it('returns vote counts and percentages without resident disclosure', async () => {
      const { dataSource, builders } = makeDataSource({
        getManyAndCount: [
          [
            [
              {
                id: 'poll-1',
                organization_id: orgId,
                title: 'Amenities',
                status: 'CLOSED',
                starts_at: new Date('2026-01-01T00:00:00.000Z'),
                ends_at: new Date('2026-01-10T00:00:00.000Z'),
                created_at: new Date('2025-12-30T00:00:00.000Z'),
                updated_at: new Date('2026-01-10T00:00:00.000Z'),
              },
            ],
            1,
          ],
        ],
        getRawMany: [
          [
            {
              option_id: 'opt-1',
              poll_id: 'poll-1',
              option_text: 'Yes',
              display_order: '1',
              vote_count: '3',
            },
            {
              option_id: 'opt-2',
              poll_id: 'poll-1',
              option_text: 'No',
              display_order: '2',
              vote_count: '1',
            },
          ],
        ],
      });
      const service = new ReportsService(dataSource);

      const result = await service.getPolls(orgId);

      expect(result.items[0]).toMatchObject({
        poll_id: 'poll-1',
        title: 'Amenities',
        status: 'CLOSED',
        total_votes: 4,
      });
      expect(result.items[0].options).toEqual([
        {
          option_id: 'opt-1',
          option_text: 'Yes',
          display_order: 1,
          vote_count: 3,
          percentage: 75,
        },
        {
          option_id: 'opt-2',
          option_text: 'No',
          display_order: 2,
          vote_count: 1,
          percentage: 25,
        },
      ]);

      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain('resident');
      expect(builders[1].addSelect.mock.calls.some((c) =>
        String(c[0]).includes('COUNT(vote.id)'),
      )).toBe(true);
    });
  });

  describe('reports are read-only', () => {
    it('never writes to the database', async () => {
      const { dataSource, writes } = makeDataSource();
      const service = new ReportsService(dataSource);

      for (const [, call] of REPORT_CALLS) {
        await call(service);
      }

      expect(writes.save).not.toHaveBeenCalled();
      expect(writes.insert).not.toHaveBeenCalled();
      expect(writes.update).not.toHaveBeenCalled();
      expect(writes.delete).not.toHaveBeenCalled();
      expect(writes.remove).not.toHaveBeenCalled();
    });

    it('never imports or calls the audit module', () => {
      const source = fs.readFileSync(
        path.join(__dirname, 'reports.service.ts'),
        'utf8',
      );
      const code = source
        .split('\n')
        .filter((line) => {
          const trimmed = line.trim();
          return !trimmed.startsWith('*') && !trimmed.startsWith('//');
        })
        .join('\n');
      expect(code).not.toMatch(/AuditService|recordAudit|AuditLog/);
      expect(code).not.toMatch(/audit/i);
      const service = new ReportsService(makeDataSource().dataSource);
      expect((service as any).auditService).toBeUndefined();
    });
  });
});
