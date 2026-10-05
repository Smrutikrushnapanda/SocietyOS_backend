import { ForbiddenException } from '@nestjs/common';
import { ExportsService } from './exports.service';
import {
  CsvExportResult,
  EXPORT_COLUMNS,
  EXPORT_FILENAMES,
  EXPORT_MAX_ROWS,
} from './exports.types';
import { ReportsService } from '../reports/reports.service';

const ORG = 'org-aaaa-0001';

function csvLines(result: CsvExportResult): string[] {
  return result.csv.replace(/\r\n$/u, '').split('\r\n');
}

function headerOf(result: CsvExportResult): string[] {
  return csvLines(result)[0].split(',');
}

function buildService(overrides: Record<string, any> = {}) {
  const reports: any = {
    fetchResidents: jest.fn().mockResolvedValue({ rows: [], truncated: false }),
    fetchVisitors: jest
      .fn()
      .mockResolvedValue({ visits: [], approvals: new Map(), passes: new Map(), truncated: false }),
    fetchMaintenanceDues: jest
      .fn()
      .mockResolvedValue({ rows: [], truncated: false }),
    fetchPayments: jest.fn().mockResolvedValue({ rows: [], truncated: false }),
    fetchComplaints: jest.fn().mockResolvedValue({ rows: [], truncated: false }),
    fetchNotices: jest.fn().mockResolvedValue({ rows: [], truncated: false }),
    fetchPolls: jest
      .fn()
      .mockResolvedValue({ polls: [], optionRows: [], truncated: false }),
    ...overrides,
  };
  return {
    service: new ExportsService(reports as ReportsService),
    reports,
  };
}

describe('ExportsService (Phase 10 Step 4)', () => {
  const CALLS = [
    ['exportResidents', 'fetchResidents'],
    ['exportMaintenanceDues', 'fetchMaintenanceDues'],
    ['exportPayments', 'fetchPayments'],
    ['exportComplaints', 'fetchComplaints'],
    ['exportNotices', 'fetchNotices'],
  ] as const;

  describe('shared fetch pipeline', () => {
    it.each(CALLS)('%s delegates to %s with org, filters and max rows', async (method, fetch) => {
      const { service, reports } = buildService();
      const filters = { status: 'OPEN' } as any;
      await service[method](ORG, filters);

      expect(reports[fetch]).toHaveBeenCalledTimes(1);
      expect(reports[fetch]).toHaveBeenCalledWith(ORG, filters, EXPORT_MAX_ROWS);
      expect(EXPORT_MAX_ROWS).toBe(5000);
    });

    it('exportVisitors delegates to fetchVisitors with org, filters and max rows', async () => {
      const { service, reports } = buildService();
      const filters = { visit_status: 'INSIDE' } as any;
      await service.exportVisitors(ORG, filters);
      expect(reports.fetchVisitors).toHaveBeenCalledWith(ORG, filters, EXPORT_MAX_ROWS);
    });

    it('exportPolls delegates to fetchPolls with org, filters and max rows', async () => {
      const { service, reports } = buildService();
      const filters = { status: 'ACTIVE' } as any;
      await service.exportPolls(ORG, filters);
      expect(reports.fetchPolls).toHaveBeenCalledWith(ORG, filters, EXPORT_MAX_ROWS);
    });

    it('passes the resolved organization through unchanged (never derived from input)', async () => {
      const { service, reports } = buildService();
      await service.exportNotices('org-bbbb-0002');
      expect(reports.fetchNotices.mock.calls[0][0]).toBe('org-bbbb-0002');
    });

    it('throws ForbiddenException without an organization', async () => {
      const { service } = buildService();
      await expect(service.exportPayments('' as any)).rejects.toThrow(ForbiddenException);
      await expect(service.exportPayments(null as any)).rejects.toThrow(ForbiddenException);
      await expect(service.exportResidents(undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('uses a default empty filter object when none is supplied', async () => {
      const { service, reports } = buildService();
      await service.exportComplaints(ORG);
      expect(reports.fetchComplaints.mock.calls[0][1]).toBeDefined();
      expect(reports.fetchComplaints.mock.calls[0][2]).toBe(EXPORT_MAX_ROWS);
    });
  });

  describe('CSV document shape', () => {
    it('emits the fixed resident columns as the header row', async () => {
      const { service } = buildService();
      const result = await service.exportResidents(ORG);
      expect(headerOf(result)).toEqual([...EXPORT_COLUMNS.residents]);
      expect(result.filename).toBe('residents.csv');
    });

    it('maps resident rows onto the fixed columns', async () => {
      const resident = {
        id: 'res-1',
        kyc_status: 'VERIFIED',
        app_access_status: 'ACTIVE',
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        flat: {
          flat_identifier: 'A-101',
          building: { name: 'Tower A' },
          floor: { floor_number: 3 },
        },
      };
      const { service } = buildService({
        fetchResidents: jest.fn().mockResolvedValue({ rows: [resident], truncated: false }),
      });

      const result = await service.exportResidents(ORG);
      const lines = csvLines(result);
      expect(lines).toHaveLength(2);
      expect(lines[1]).toBe(
        'res-1,A-101,Tower A,3,VERIFIED,ACTIVE,true,2026-01-01T00:00:00.000Z',
      );
      expect(result.rowCount).toBe(1);
      expect(result.truncated).toBe(false);
    });

    it('renders missing resident relations as empty fields', async () => {
      const { service } = buildService({
        fetchResidents: jest
          .fn()
          .mockResolvedValue({ rows: [{ id: 'res-2', kyc_status: 'PENDING', app_access_status: 'PENDING', isActive: false }], truncated: false }),
      });
      const result = await service.exportResidents(ORG);
      expect(csvLines(result)[1]).toBe(
        'res-2,,,,PENDING,PENDING,false,',
      );
    });
  });

  describe('visitors export', () => {
    it('joins visit, approval and pass state without resident data', async () => {
      const visit = {
        id: 'visit-1',
        visit_status: 'INSIDE',
        visit_purpose: 'Guest',
        expected_entry_time: new Date('2026-02-01T09:00:00.000Z'),
        actual_entry_time: new Date('2026-02-01T09:05:00.000Z'),
        createdAt: new Date('2026-01-31T18:00:00.000Z'),
        visitor: {
          id: 'visitor-1',
          name: 'John Doe',
          mobile: '9876543210',
        },
      };
      const { service } = buildService({
        fetchVisitors: jest.fn().mockResolvedValue({
          visits: [visit],
          approvals: new Map([['visit-1', { approval_status: 'APPROVED' }]]),
          passes: new Map([['visit-1', { pass_status: 'ISSUED' }]]),
          truncated: false,
        }),
      });

      const result = await service.exportVisitors(ORG);
      expect(headerOf(result)).toEqual([...EXPORT_COLUMNS.visitors]);
      expect(csvLines(result)[1]).toBe(
        'visitor-1,John Doe,9876543210,visit-1,INSIDE,Guest,APPROVED,ISSUED,2026-02-01T09:00:00.000Z,2026-02-01T09:05:00.000Z,2026-01-31T18:00:00.000Z',
      );
    });

    it('shows empty approval/pass state when no approvals exist', async () => {
      const visit = {
        id: 'visit-2',
        visit_status: 'REQUESTED',
        visitor: { id: 'visitor-2', name: 'A, B', mobile: '9000000000' },
      };
      const { service } = buildService({
        fetchVisitors: jest.fn().mockResolvedValue({
          visits: [visit],
          approvals: new Map(),
          passes: new Map(),
          truncated: false,
        }),
      });
      const result = await service.exportVisitors(ORG);
      // Comma in name must be quoted per RFC 4180.
      expect(csvLines(result)[1]).toContain('"A, B"');
    });
  });

  describe('polls export (aggregate only)', () => {
    it('emits one row per option with vote_count, percentage and total_votes', async () => {
      const poll = {
        id: 'poll-1',
        title: 'Lift repair?',
        status: 'ACTIVE',
        starts_at: new Date('2026-03-01T00:00:00.000Z'),
        ends_at: new Date('2026-03-08T00:00:00.000Z'),
      };
      const { service } = buildService({
        fetchPolls: jest.fn().mockResolvedValue({
          polls: [poll],
          optionRows: [
            { poll_id: 'poll-1', option_text: 'Yes', vote_count: 3 },
            { poll_id: 'poll-1', option_text: 'No', vote_count: 1 },
          ],
          truncated: false,
        }),
      });

      const result = await service.exportPolls(ORG);
      expect(headerOf(result)).toEqual([...EXPORT_COLUMNS.polls]);
      const lines = csvLines(result);
      expect(lines).toHaveLength(3);
      expect(lines[1]).toBe(
        'poll-1,Lift repair?,ACTIVE,2026-03-01T00:00:00.000Z,2026-03-08T00:00:00.000Z,Yes,3,75,4',
      );
      expect(lines[2]).toContain(',No,1,25,4');
    });

    it('never exports resident ids or individual votes', async () => {
      const { service } = buildService({
        fetchPolls: jest.fn().mockResolvedValue({
          polls: [{ id: 'poll-1', title: 'T', status: 'CLOSED' }],
          optionRows: [{ poll_id: 'poll-1', option_text: 'A', vote_count: 0 }],
          truncated: false,
        }),
      });
      const result = await service.exportPolls(ORG);
      const header = headerOf(result).join(',');
      expect(header).not.toMatch(/resident|voter|user_id|vote_id/i);
      expect(result.csv).not.toMatch(/resident_id|voter_id/);
    });

    it('computes 0% when a poll has no votes', async () => {
      const { service } = buildService({
        fetchPolls: jest.fn().mockResolvedValue({
          polls: [{ id: 'poll-1', title: 'T', status: 'ACTIVE' }],
          optionRows: [{ poll_id: 'poll-1', option_text: 'A', vote_count: 0 }],
          truncated: false,
        }),
      });
      const result = await service.exportPolls(ORG);
      expect(csvLines(result)[1]).toBe('poll-1,T,ACTIVE,,,A,0,0,0');
    });
  });

  describe('truncation', () => {
    it('propagates the fetch-one-extra truncated flag', async () => {
      const { service } = buildService({
        fetchPayments: jest.fn().mockResolvedValue({ rows: [], truncated: true }),
      });
      const result = await service.exportPayments(ORG);
      expect(result.truncated).toBe(true);
      expect(result.rowCount).toBe(0);
    });

    it('is false when at most 5000 rows matched', async () => {
      const rows = Array.from({ length: 5000 }, (_, i) => ({
        id: `n-${i}`,
        category: 'x',
        subject: 's',
        status: 'OPEN',
        priority: 'MEDIUM',
        resident_id: 'r',
      }));
      const { service } = buildService({
        fetchComplaints: jest.fn().mockResolvedValue({ rows, truncated: false }),
      });
      const result = await service.exportComplaints(ORG);
      expect(result.rowCount).toBe(5000);
      expect(result.truncated).toBe(false);
      expect(csvLines(result)).toHaveLength(5001);
    });
  });

  describe('sensitive data and safety', () => {
    it('never exports auth material (password, otp, tokens, email)', async () => {
      const { service } = buildService({
        fetchResidents: jest.fn().mockResolvedValue({
          rows: [{ id: 'res-1', kyc_status: 'VERIFIED', app_access_status: 'ACTIVE', isActive: true }],
          truncated: false,
        }),
      });
      const result = await service.exportResidents(ORG);
      const header = headerOf(result).join(',');
      expect(header).not.toMatch(/password|otp|token|email|mobile|phone|secret/i);
    });

    it('neutralizes formula injection in string cells', async () => {
      const { service } = buildService({
        fetchComplaints: jest.fn().mockResolvedValue({
          rows: [
            {
              id: 'c-1',
              category: '=cmd|calc',
              subject: '@SUM(A1)',
              status: 'OPEN',
              priority: 'HIGH',
              resident_id: 'r-1',
            },
          ],
          truncated: false,
        }),
      });
      const result = await service.exportComplaints(ORG);
      expect(result.csv).toContain("'=cmd|calc");
      expect(result.csv).toContain("'@SUM(A1)");
      // No cell in the document may start with a raw formula trigger.
      for (const line of csvLines(result).slice(1)) {
        for (const rawCell of line.split(',')) {
          const cell = rawCell.replace(/^"|"$/gu, '');
          if (cell.length > 0) {
            expect('=+-@'.includes(cell.charAt(0))).toBe(false);
          }
        }
      }
    });

    it('empty organization result still produces a valid header-only CSV', async () => {
      const { service } = buildService();
      const result = await service.exportNotices(ORG);
      expect(result.rowCount).toBe(0);
      expect(result.truncated).toBe(false);
      expect(csvLines(result)).toEqual([[...EXPORT_COLUMNS.notices].join(',')]);
      expect(result.filename).toBe(EXPORT_FILENAMES.notices);
    });
  });
});
