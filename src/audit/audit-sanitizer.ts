import { Injectable } from '@nestjs/common';
import { AuditEntityType } from './audit.enums';

/**
 * Phase 10 — Centralized audit snapshot sanitizer.
 *
 * This is the ONLY place where audit old_values/new_values snapshots are
 * sanitized. AuditService.record() always calls this before persisting, so a
 * call site cannot accidentally persist a forbidden field even if it passes one.
 *
 * Never persisted (case-insensitive, any nesting depth):
 *   - raw OTP values
 *   - refresh-token identifiers/secrets
 *   - FCM push-token values
 *   - user.mobileNumber
 *   - password / secret (defensive)
 *
 * visitor.mobile is allowed ONLY for entity_type = VISITOR. For every other
 * entity type, `mobile` fields are redacted.
 */

export const AUDIT_REDACTED = '[REDACTED]';
export const AUDIT_TRUNCATED = '[TRUNCATED]';
export const AUDIT_CIRCULAR = '[CIRCULAR]';

const MAX_DEPTH = 6;
const MAX_ARRAY_LENGTH = 50;

const ALWAYS_DENIED_KEY_PATTERNS: RegExp[] = [
  /otp/i,
  /refresh_?token/i,
  /refreshtokenid/i,
  /^token$/i,
  /push_?token/i,
  /fcm_?token/i,
  /^mobilenumber$/i,
  /password/i,
  /secret/i,
];

function isDeniedKey(
  key: string,
  entityType: AuditEntityType | string | undefined | null,
): boolean {
  if (ALWAYS_DENIED_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
    return true;
  }
  // `mobile` is only allowed for visitor audit/reporting snapshots.
  if (
    key.toLowerCase() === 'mobile' &&
    entityType !== AuditEntityType.VISITOR
  ) {
    return true;
  }
  return false;
}

@Injectable()
export class AuditSanitizer {
  /**
   * Deep-clone and sanitize a snapshot. Returns null when there is nothing to
   * persist. Never returns a raw sensitive value.
   */
  sanitizeSnapshot(
    entityType: AuditEntityType | string | undefined | null,
    input: unknown,
  ): Record<string, unknown> | null {
    if (input === null || input === undefined) {
      return null;
    }

    const result = this.cloneAndSanitize(
      input,
      entityType,
      0,
      new WeakSet<object>(),
    );

    if (result === null || result === undefined || typeof result !== 'object') {
      return null;
    }

    return result as Record<string, unknown>;
  }

  private cloneAndSanitize(
    value: unknown,
    entityType: AuditEntityType | string | undefined | null,
    depth: number,
    seen: WeakSet<object>,
  ): unknown {
    // `undefined` is a drop sentinel (dropped by the parent container);
    // `null` is preserved as an explicit null value.
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }

    const valueType = typeof value;
    // Functions, symbols and bigints cannot be persisted and are dropped.
    if (
      valueType === 'function' ||
      valueType === 'symbol' ||
      valueType === 'bigint'
    ) {
      return undefined;
    }
    // Primitives.
    if (valueType !== 'object') {
      return value;
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (depth > MAX_DEPTH) {
      return AUDIT_TRUNCATED;
    }

    const objectValue = value as object;
    if (seen.has(objectValue)) {
      return AUDIT_CIRCULAR;
    }
    seen.add(objectValue);

    if (Array.isArray(value)) {
      const out: unknown[] = [];
      const end = Math.min(value.length, MAX_ARRAY_LENGTH);
      for (let i = 0; i < end; i++) {
        const sanitized = this.cloneAndSanitize(
          value[i],
          entityType,
          depth + 1,
          seen,
        );
        if (sanitized !== undefined) {
          out.push(sanitized);
        }
      }
      if (value.length > MAX_ARRAY_LENGTH) {
        out.push(AUDIT_TRUNCATED);
      }
      return out;
    }

    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (isDeniedKey(key, entityType)) {
        out[key] = AUDIT_REDACTED;
        continue;
      }
      const sanitized = this.cloneAndSanitize(
        val,
        entityType,
        depth + 1,
        seen,
      );
      if (sanitized !== undefined) {
        out[key] = sanitized;
      }
    }
    return out;
  }
}
