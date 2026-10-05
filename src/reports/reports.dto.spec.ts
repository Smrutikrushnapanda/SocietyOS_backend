import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  ComplaintsReportQueryDto,
  MaintenanceDuesReportQueryDto,
  NoticesReportQueryDto,
  PaymentsReportQueryDto,
  PollsReportQueryDto,
  REPORT_MAX_PAGE_SIZE,
  ResidentsReportQueryDto,
  VisitorsReportQueryDto,
} from './reports.dto';

/**
 * Phase 10 - Step 3: server-side filter / pagination validation.
 * Mirrors the global ValidationPipe (whitelist: true, transform: true).
 */
async function validateQuery<T extends object>(
  cls: new () => T,
  plain: Record<string, unknown>,
): Promise<{ errors: string[]; instance: T }> {
  const instance = plainToInstance(cls, plain) as T;
  const errors = await validate(instance as object, {
    whitelist: true,
    forbidNonWhitelisted: false,
    skipMissingProperties: true,
  });
  return {
    errors: errors.map((error) => error.property),
    instance,
  };
}

describe('report query DTOs (Phase 10 Step 3)', () => {
  describe('pagination validation', () => {
    it('accepts a valid page/limit and transforms them to numbers', async () => {
      const { errors, instance } = await validateQuery(ResidentsReportQueryDto, {
        page: '2',
        limit: '10',
      });
      expect(errors).toEqual([]);
      expect(instance.page).toBe(2);
      expect(instance.limit).toBe(10);
    });

    it('rejects a non-numeric page', async () => {
      const { errors } = await validateQuery(ResidentsReportQueryDto, {
        page: 'abc',
      });
      expect(errors).toContain('page');
    });

    it('rejects page 0 and negative pages', async () => {
      const zero = await validateQuery(ResidentsReportQueryDto, { page: '0' });
      expect(zero.errors).toContain('page');
      const negative = await validateQuery(ResidentsReportQueryDto, {
        page: '-3',
      });
      expect(negative.errors).toContain('page');
    });

    it('rejects a non-numeric limit', async () => {
      const { errors } = await validateQuery(ResidentsReportQueryDto, {
        limit: 'many',
      });
      expect(errors).toContain('limit');
    });

    it('enforces the maximum limit', async () => {
      const over = await validateQuery(ResidentsReportQueryDto, {
        limit: String(REPORT_MAX_PAGE_SIZE + 1),
      });
      expect(over.errors).toContain('limit');

      const atMax = await validateQuery(ResidentsReportQueryDto, {
        limit: String(REPORT_MAX_PAGE_SIZE),
      });
      expect(atMax.errors).toEqual([]);
    });

    it('defaults to a bounded server-side page/limit', async () => {
      const { instance } = await validateQuery(ResidentsReportQueryDto, {});
      expect(instance.page).toBe(1);
      expect(instance.limit).toBeLessThanOrEqual(REPORT_MAX_PAGE_SIZE);
    });
  });

  describe('date range validation', () => {
    it('accepts ISO dates and ISO timestamps', async () => {
      const dates = await validateQuery(VisitorsReportQueryDto, {
        from: '2026-01-01',
        to: '2026-01-31',
      });
      expect(dates.errors).toEqual([]);

      const stamps = await validateQuery(PaymentsReportQueryDto, {
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-01-31T23:59:59.000Z',
      });
      expect(stamps.errors).toEqual([]);
    });

    it('rejects an invalid date', async () => {
      const { errors } = await validateQuery(VisitorsReportQueryDto, {
        from: '01-01-2026',
      });
      expect(errors).toContain('from');

      const { errors: toErrors } = await validateQuery(
        MaintenanceDuesReportQueryDto,
        { to: 'not-a-date' },
      );
      expect(toErrors).toContain('to');
    });
  });

  describe('notice statuses', () => {
    it('accepts only DRAFT / PUBLISHED / ARCHIVED', async () => {
      for (const status of ['DRAFT', 'PUBLISHED', 'ARCHIVED']) {
        const { errors } = await validateQuery(NoticesReportQueryDto, {
          status,
        });
        expect(errors).toEqual([]);
      }
    });

    it('rejects EXPIRED (not a notice status)', async () => {
      const { errors } = await validateQuery(NoticesReportQueryDto, {
        status: 'EXPIRED',
      });
      expect(errors).toContain('status');
    });
  });

  describe('poll statuses', () => {
    it('accepts only DRAFT / PUBLISHED / CLOSED', async () => {
      for (const status of ['DRAFT', 'PUBLISHED', 'CLOSED']) {
        const { errors } = await validateQuery(PollsReportQueryDto, { status });
        expect(errors).toEqual([]);
      }
    });

    it('rejects an unknown poll status', async () => {
      const { errors } = await validateQuery(PollsReportQueryDto, {
        status: 'ARCHIVED',
      });
      expect(errors).toContain('status');
    });
  });

  describe('other filters', () => {
    it('validates complaint status and priority', async () => {
      expect(
        (await validateQuery(ComplaintsReportQueryDto, { status: 'RESOLVED' }))
          .errors,
      ).toEqual([]);
      expect(
        (await validateQuery(ComplaintsReportQueryDto, { priority: 'HIGH' }))
          .errors,
      ).toEqual([]);
      expect(
        (await validateQuery(ComplaintsReportQueryDto, { priority: 'CRITICAL' }))
          .errors,
      ).toContain('priority');
    });

    it('validates billing period format (YYYY-MM)', async () => {
      expect(
        (await validateQuery(MaintenanceDuesReportQueryDto, {
          billing_period: '2026-01',
        })).errors,
      ).toEqual([]);
      expect(
        (await validateQuery(MaintenanceDuesReportQueryDto, {
          billing_period: '2026-13',
        })).errors,
      ).toContain('billing_period');
    });

    it('rejects a non-uuid id filter', async () => {
      const { errors } = await validateQuery(ResidentsReportQueryDto, {
        flat_id: 'flat-1',
      });
      expect(errors).toContain('flat_id');
    });
  });

  describe('organization scope cannot be supplied by the client', () => {
    it('strips a client supplied organization_id', async () => {
      const { instance } = await validateQuery(ResidentsReportQueryDto, {
        organization_id: 'org-other',
        page: '1',
      });
      expect((instance as Record<string, unknown>).organization_id).toBeUndefined();
      expect(
        (instance as Record<string, unknown>).organizationId,
      ).toBeUndefined();
    });

    it('declares no organization_id property on any report DTO', () => {
      for (const dto of [
        ResidentsReportQueryDto,
        VisitorsReportQueryDto,
        MaintenanceDuesReportQueryDto,
        PaymentsReportQueryDto,
        ComplaintsReportQueryDto,
        NoticesReportQueryDto,
        PollsReportQueryDto,
      ]) {
        expect(Object.getOwnPropertyNames(dto.prototype)).not.toContain(
          'organization_id',
        );
        expect(Object.getOwnPropertyNames(dto.prototype)).not.toContain(
          'organizationId',
        );
      }
    });

    it('declares no client selected column / raw SQL inputs', () => {
      const forbidden = ['columns', 'select', 'order_by', 'orderBy', 'raw', 'sql'];
      for (const dto of [
        ResidentsReportQueryDto,
        VisitorsReportQueryDto,
        MaintenanceDuesReportQueryDto,
        PaymentsReportQueryDto,
        ComplaintsReportQueryDto,
        NoticesReportQueryDto,
        PollsReportQueryDto,
      ]) {
        const props = Object.getOwnPropertyNames(dto.prototype);
        for (const name of forbidden) {
          expect(props).not.toContain(name);
        }
      }
    });
  });
});
