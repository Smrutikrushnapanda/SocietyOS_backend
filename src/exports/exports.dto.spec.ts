import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  ComplaintsExportQueryDto,
  MaintenanceDuesExportQueryDto,
  NoticesExportQueryDto,
  PaymentsExportQueryDto,
  PollsExportQueryDto,
  ResidentsExportQueryDto,
  VisitorsExportQueryDto,
} from './exports.dto';
import { EXPORT_MAX_ROWS } from './exports.types';

/**
 * Phase 10 Step 4: export query validation — mirrors the global
 * ValidationPipe (whitelist: true, transform: true, forbidNonWhitelisted:
 * false). Export DTOs must never declare organization scope, pagination or
 * column selection.
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

type Dtor = new () => object;

const ALL_DTOS: [string, Dtor][] = [
  ['ResidentsExportQueryDto', ResidentsExportQueryDto],
  ['VisitorsExportQueryDto', VisitorsExportQueryDto],
  ['MaintenanceDuesExportQueryDto', MaintenanceDuesExportQueryDto],
  ['PaymentsExportQueryDto', PaymentsExportQueryDto],
  ['ComplaintsExportQueryDto', ComplaintsExportQueryDto],
  ['NoticesExportQueryDto', NoticesExportQueryDto],
  ['PollsExportQueryDto', PollsExportQueryDto],
];

describe('export query DTOs (Phase 10 Step 4)', () => {
  describe('no client control over scope, paging or columns', () => {
    it.each(ALL_DTOS)('%s declares no organization / pagination / columns field', (_name, cls) => {
      const dto = new cls() as Record<string, unknown>;
      const declared = [
        'organization_id',
        'organizationId',
        'page',
        'limit',
        'columns',
        'fields',
        'sort',
        'order',
      ];
      for (const property of declared) {
        expect(Object.prototype.hasOwnProperty.call(dto, property)).toBe(false);
        expect(Reflect.getMetadata?.('design:type', dto, property)).toBeUndefined();
      }
    });

    it('an unknown organization_id is dropped by whitelisting validation', async () => {
      const { instance } = await validateQuery(ResidentsExportQueryDto, {
        organization_id: 'org-bbbb-0002',
        kyc_status: 'VERIFIED',
      });
      expect((instance as Record<string, unknown>).organization_id).toBeUndefined();
      expect((instance as Record<string, unknown>).kyc_status).toBe('VERIFIED');
    });

    it('the residents export mirrors the report: no date range', () => {
      const dto = new ResidentsExportQueryDto() as Record<string, unknown>;
      expect(Object.prototype.hasOwnProperty.call(dto, 'from')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(dto, 'to')).toBe(false);
    });

    it('EXPORT_MAX_ROWS is a fixed 5000 and not configurable per request', () => {
      expect(EXPORT_MAX_ROWS).toBe(5000);
    });
  });

  describe('enum filter validation', () => {
    it.each(ALL_DTOS)('%s accepts a valid empty query', async (_name, cls) => {
      const { errors } = await validateQuery(cls, {});
      expect(errors).toEqual([]);
    });

    it('residents: validates kyc_status and booleans', async () => {
      const ok = await validateQuery(ResidentsExportQueryDto, {
        kyc_status: 'VERIFIED',
        active: 'true',
        app_access: 'false',
      });
      expect(ok.errors).toEqual([]);

      const badKyc = await validateQuery(ResidentsExportQueryDto, {
        kyc_status: 'APPROVED',
      });
      expect(badKyc.errors).toContain('kyc_status');

      const badActive = await validateQuery(ResidentsExportQueryDto, {
        active: 'yes',
      });
      expect(badActive.errors).toContain('active');
    });

    it('visitors: validates visit_status', async () => {
      const ok = await validateQuery(VisitorsExportQueryDto, {
        visit_status: 'PENDING',
      });
      expect(ok.errors).toEqual([]);

      const bad = await validateQuery(VisitorsExportQueryDto, {
        visit_status: 'INSIDE',
      });
      expect(bad.errors).toContain('visit_status');
    });

    it('maintenance-dues: validates status and billing_period', async () => {
      const ok = await validateQuery(MaintenanceDuesExportQueryDto, {
        status: 'OVERDUE',
        billing_period: '2026-01',
        has_late_charge: 'true',
      });
      expect(ok.errors).toEqual([]);

      const badStatus = await validateQuery(MaintenanceDuesExportQueryDto, {
        status: 'PARTIAL',
      });
      expect(badStatus.errors).toContain('status');

      const badPeriod = await validateQuery(MaintenanceDuesExportQueryDto, {
        billing_period: '2026-13',
      });
      expect(badPeriod.errors).toContain('billing_period');

      const badShape = await validateQuery(MaintenanceDuesExportQueryDto, {
        billing_period: '2026',
      });
      expect(badShape.errors).toContain('billing_period');
    });

    it('payments: validates status and method', async () => {
      const ok = await validateQuery(PaymentsExportQueryDto, {
        payment_status: 'COMPLETED',
        payment_method: 'UPI',
      });
      expect(ok.errors).toEqual([]);

      const badStatus = await validateQuery(PaymentsExportQueryDto, {
        payment_status: 'PAID',
      });
      expect(badStatus.errors).toContain('payment_status');

      const badMethod = await validateQuery(PaymentsExportQueryDto, {
        payment_method: 'BANK',
      });
      expect(badMethod.errors).toContain('payment_method');
    });

    it('complaints: validates status, priority and category length', async () => {
      const ok = await validateQuery(ComplaintsExportQueryDto, {
        status: 'OPEN',
        priority: 'HIGH',
        category: 'Plumbing',
      });
      expect(ok.errors).toEqual([]);

      const badPriority = await validateQuery(ComplaintsExportQueryDto, {
        priority: 'URGENT',
      });
      expect(badPriority.errors).toContain('priority');

      const tooLong = await validateQuery(ComplaintsExportQueryDto, {
        category: 'x'.repeat(101),
      });
      expect(tooLong.errors).toContain('category');
    });

    it('notices and polls: validate status', async () => {
      const okNotice = await validateQuery(NoticesExportQueryDto, {
        status: 'PUBLISHED',
      });
      expect(okNotice.errors).toEqual([]);

      const badNotice = await validateQuery(NoticesExportQueryDto, {
        status: 'EXPIRED',
      });
      expect(badNotice.errors).toContain('status');

      const okPoll = await validateQuery(PollsExportQueryDto, {
        status: 'CLOSED',
      });
      expect(okPoll.errors).toEqual([]);

      const badPoll = await validateQuery(PollsExportQueryDto, {
        status: 'ACTIVE',
      });
      expect(badPoll.errors).toContain('status');
    });
  });

  describe('date range validation', () => {
    it.each(
      ALL_DTOS.filter(([name]) => name !== 'ResidentsExportQueryDto'),
    )('%s accepts ISO dates and timestamps, rejects garbage', async (_name, cls) => {
      const ok = await validateQuery(cls, {
        from: '2026-01-01',
        to: '2026-01-31T23:59:59.999Z',
      });
      expect(ok.errors).toEqual([]);

      const bad = await validateQuery(cls, { from: '01-01-2026' });
      expect(bad.errors).toContain('from');
    });
  });

  describe('UUID filter validation', () => {
    it('accepts a UUID and rejects a non-UUID', async () => {
      const ok = await validateQuery(ResidentsExportQueryDto, {
        building_id: '11111111-1111-4111-a111-111111111111',
      });
      expect(ok.errors).toEqual([]);

      const bad = await validateQuery(ResidentsExportQueryDto, {
        flat_id: 'not-a-uuid',
      });
      expect(bad.errors).toContain('flat_id');
    });
  });
});
