export type LateChargeFrequency = 'ONCE' | 'DAILY' | 'WEEKLY';
export interface LateChargePolicy { type: 'FIXED' | 'PERCENTAGE'; value: number; graceDays: number; frequency: LateChargeFrequency; start: 'FIRST_DAY' | 'AFTER_PERIOD'; exempt?: boolean; autoAccrue?: boolean }
export function societyCalendarDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function calculateLateCharge(policy: LateChargePolicy, amount: number, dueDate: Date | string, now = new Date()): number {
  if (policy.exempt) return 0;
  const dueDay = dueDate instanceof Date ? dueDate.toISOString().slice(0, 10) : dueDate.slice(0, 10);
  const days = Math.round((Date.parse(societyCalendarDate(now)) - Date.parse(dueDay)) / 86400000) - policy.graceDays;
  if (!Number.isFinite(days) || days <= 0) return 0;
  const periods = policy.frequency === 'DAILY' ? days : policy.frequency === 'WEEKLY' ? (policy.start === 'AFTER_PERIOD' ? Math.floor(days / 7) : Math.ceil(days / 7)) : 1;
  const fee = policy.type === 'FIXED' ? policy.value : amount * policy.value / 100;
  return Math.min(99999999.99, Math.round(fee * periods * 100) / 100);
}
export function snapshotLatePolicy(config: { late_charge_type: 'FIXED' | 'PERCENTAGE'; late_charge_value: number; late_charge_grace_days: number; late_charge_frequency?: LateChargeFrequency; late_charge_start?: 'FIRST_DAY' | 'AFTER_PERIOD' }): LateChargePolicy {
  return { autoAccrue: true, type: config.late_charge_type, value: Number(config.late_charge_value), graceDays: Number(config.late_charge_grace_days), frequency: config.late_charge_frequency ?? 'ONCE', start: config.late_charge_start ?? 'FIRST_DAY' };
}
