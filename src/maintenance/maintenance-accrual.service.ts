import { WhatsAppEventsService } from '../whatsapp/whatsapp-events.service';
import { ForbiddenException, Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { societyCalendarDate } from './late-charge.policy';

@Injectable()
export class MaintenanceAccrualService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private busy = false;
  private readonly logger = new Logger(MaintenanceAccrualService.name);
  constructor(private readonly source: DataSource, @Optional() private readonly events?: WhatsAppEventsService) {}
  onModuleInit(): void {
    this.timer = setInterval(() => { void this.refreshAll(); }, 60000);
    this.timer.unref();
  }
  onModuleDestroy(): void { clearInterval(this.timer); }
  private async refreshAll(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      const organizations: { organization_id: string }[] = await this.source.query(`SELECT DISTINCT organization_id FROM maintenance_dues WHERE status IN ('PENDING', 'OVERDUE') AND late_charge_policy->>'autoAccrue' = 'true'`);
      for (const organization of organizations) await this.refresh(organization.organization_id);
    } catch { this.logger.warn('Recurring maintenance accrual unavailable; next read or scheduled run retries'); }
    finally { this.busy = false; }
  }
  async refresh(organizationId: string, now = new Date()): Promise<void> {
    if (!organizationId) throw new ForbiddenException('Organization context required');
    const result = await this.source.query(`WITH candidates AS (
      SELECT id, status AS old_status, GREATEST(late_charge, LEAST(99999999.99, ROUND((late_charge_policy->>'value')::numeric * CASE WHEN late_charge_policy->>'type' = 'PERCENTAGE' THEN calculated_amount / 100 ELSE 1 END *
        CASE WHEN late_charge_policy->>'frequency' = 'DAILY' THEN GREATEST(($2::date - due_date) - (late_charge_policy->>'graceDays')::integer, 0)
          WHEN late_charge_policy->>'frequency' = 'ONCE' THEN CASE WHEN ($2::date - due_date) > (late_charge_policy->>'graceDays')::integer THEN 1 ELSE 0 END
          WHEN late_charge_policy->>'start' = 'AFTER_PERIOD' THEN FLOOR(GREATEST(($2::date - due_date) - (late_charge_policy->>'graceDays')::integer, 0) / 7.0)
          ELSE CEIL(GREATEST(($2::date - due_date) - (late_charge_policy->>'graceDays')::integer, 0) / 7.0) END, 2))) AS charge
      FROM maintenance_dues WHERE organization_id = $1 AND status IN ('PENDING', 'OVERDUE')
      AND late_charge_policy->>'type' IN ('FIXED', 'PERCENTAGE') AND late_charge_policy->>'autoAccrue' = 'true'
      AND COALESCE((late_charge_policy->>'exempt')::boolean, false) = false AND due_date < $2::date
    ) UPDATE maintenance_dues d SET late_charge = GREATEST(d.late_charge, c.charge), status = 'OVERDUE', updated_at = CURRENT_TIMESTAMP
      FROM candidates c WHERE d.id = c.id AND d.organization_id = $1 AND d.status IN ('PENDING', 'OVERDUE')
      AND COALESCE((d.late_charge_policy->>'exempt')::boolean, false) = false
      AND (d.late_charge < c.charge OR d.status <> 'OVERDUE')
      RETURNING d.id, d.organization_id, d.flat_id, d.due_date, d.calculated_amount, d.late_charge, d.late_charge_waived, c.old_status`, [organizationId, societyCalendarDate(now)]);
    const changed: { organization_id: string; flat_id: string; due_date: Date | string; calculated_amount: string; late_charge: string; late_charge_waived: string; old_status: string }[] = Array.isArray(result?.[0]) ? result[0] : result;
    for (const due of changed ?? []) {
      if (due.old_status !== 'PENDING') continue;
      const amount = String(Number(due.calculated_amount) + Number(due.late_charge) - Number(due.late_charge_waived));
      void this.events?.flat(due.organization_id, due.flat_id, 'MAINTENANCE_OVERDUE', 'Maintenance payment is overdue. Open SocietyOS for details.', { key: 'maintenanceOverdue', variables: { amount, due_date: new Date(due.due_date).toISOString().slice(0, 10) } });
    }

  }
}
