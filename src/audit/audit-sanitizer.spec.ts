import {
  AuditSanitizer,
  AUDIT_REDACTED,
  AUDIT_TRUNCATED,
} from './audit-sanitizer';
import { AuditEntityType } from './audit.enums';

describe('AuditSanitizer (Phase 10)', () => {
  let sanitizer: AuditSanitizer;

  beforeEach(() => {
    sanitizer = new AuditSanitizer();
  });

  it('returns null for null/undefined input', () => {
    expect(sanitizer.sanitizeSnapshot(AuditEntityType.NOTICE, null)).toBeNull();
    expect(
      sanitizer.sanitizeSnapshot(AuditEntityType.NOTICE, undefined),
    ).toBeNull();
  });

  it('redacts raw OTP values', () => {
    const out = sanitizer.sanitizeSnapshot(AuditEntityType.NOTICE, {
      otp: '123456',
      otpCode: '999999',
      meta: { oneTimeOtp: '111111' },
    });
    expect(out).toEqual({
      otp: AUDIT_REDACTED,
      otpCode: AUDIT_REDACTED,
      meta: { oneTimeOtp: AUDIT_REDACTED },
    });
  });

  it('redacts refresh-token identifiers/secrets', () => {
    const out = sanitizer.sanitizeSnapshot(AuditEntityType.RESIDENT, {
      refreshTokenId: 'abc',
      refresh_token: 'xyz',
      refreshToken: 'zzz',
    });
    expect(out).toEqual({
      refreshTokenId: AUDIT_REDACTED,
      refresh_token: AUDIT_REDACTED,
      refreshToken: AUDIT_REDACTED,
    });
  });

  it('redacts FCM push-token values', () => {
    const out = sanitizer.sanitizeSnapshot(AuditEntityType.FILE, {
      token: 'fcm-token-value',
      pushToken: 'push-value',
      fcmToken: 'fcm-value',
    });
    expect(out).toEqual({
      token: AUDIT_REDACTED,
      pushToken: AUDIT_REDACTED,
      fcmToken: AUDIT_REDACTED,
    });
  });

  it('redacts user.mobileNumber (top level and nested)', () => {
    const out = sanitizer.sanitizeSnapshot(AuditEntityType.RESIDENT, {
      mobileNumber: '+919800000000',
      user: { mobileNumber: '+919800000001' },
    });
    expect(out).toEqual({
      mobileNumber: AUDIT_REDACTED,
      user: { mobileNumber: AUDIT_REDACTED },
    });
  });

  it('allows visitor.mobile for VISITOR entities', () => {
    const out = sanitizer.sanitizeSnapshot(AuditEntityType.VISITOR, {
      name: 'Guest',
      mobile: '+919800000002',
    });
    expect(out).toEqual({ name: 'Guest', mobile: '+919800000002' });
  });

  it('redacts mobile for non-VISITOR entities', () => {
    const out = sanitizer.sanitizeSnapshot(AuditEntityType.COMPLAINT, {
      mobile: '+919800000003',
    });
    expect(out).toEqual({ mobile: AUDIT_REDACTED });
  });

  it('redacts sensitive fields at any nesting depth (objects + arrays)', () => {
    const out = sanitizer.sanitizeSnapshot(AuditEntityType.NOTICE, {
      a: { b: { c: { otp: 'deep-secret' } } },
      list: [{ refreshToken: 'r' }, { ok: 'v' }],
    });
    expect(out).toEqual({
      a: { b: { c: { otp: AUDIT_REDACTED } } },
      list: [{ refreshToken: AUDIT_REDACTED }, { ok: 'v' }],
    });
  });

  it('serializes Date values to ISO strings', () => {
    const date = new Date('2020-01-01T00:00:00.000Z');
    const out = sanitizer.sanitizeSnapshot(AuditEntityType.NOTICE, {
      created_at: date,
    });
    expect(out).toEqual({ created_at: '2020-01-01T00:00:00.000Z' });
  });

  it('drops functions and undefined', () => {
    const out = sanitizer.sanitizeSnapshot(AuditEntityType.NOTICE, {
      ok: 'value',
      fn: () => 'x',
      missing: undefined,
    });
    expect(out).toEqual({ ok: 'value' });
  });

  it('deep-clones: does not mutate the input', () => {
    const input = { a: { b: 'c' } };
    const out = sanitizer.sanitizeSnapshot(AuditEntityType.NOTICE, input);
    (out as any).a.b = 'mutated';
    expect(input.a.b).toBe('c');
  });

  it('limits recursion depth without leaking deeper secrets', () => {
    let deep: any = { otp: 'very-deep-secret' };
    for (let i = 0; i < 12; i++) {
      deep = { next: deep };
    }
    const out = sanitizer.sanitizeSnapshot(AuditEntityType.NOTICE, deep);
    expect(JSON.stringify(out)).not.toContain('very-deep-secret');
  });

  it('limits array length', () => {
    const arr = Array.from({ length: 100 }, (_, i) => i);
    const out = sanitizer.sanitizeSnapshot(AuditEntityType.NOTICE, { arr });
    expect((out as any).arr.length).toBe(51);
    expect((out as any).arr[50]).toBe(AUDIT_TRUNCATED);
  });

  it('never returns a raw sensitive value (stringified output is clean)', () => {
    const out = sanitizer.sanitizeSnapshot(AuditEntityType.RESIDENT, {
      otp: 'OTP-LEAK-CHECK',
      refreshToken: 'REFRESH-LEAK-CHECK',
      token: 'FCM-LEAK-CHECK',
      mobileNumber: 'MOBILE-LEAK-CHECK',
      nested: { password: 'PASSWORD-LEAK-CHECK', secret: 'SECRET-LEAK-CHECK' },
    });
    const serialized = JSON.stringify(out);
    expect(serialized).not.toContain('OTP-LEAK-CHECK');
    expect(serialized).not.toContain('REFRESH-LEAK-CHECK');
    expect(serialized).not.toContain('FCM-LEAK-CHECK');
    expect(serialized).not.toContain('MOBILE-LEAK-CHECK');
    expect(serialized).not.toContain('PASSWORD-LEAK-CHECK');
    expect(serialized).not.toContain('SECRET-LEAK-CHECK');
    expect(serialized).toContain(AUDIT_REDACTED);
  });
});
