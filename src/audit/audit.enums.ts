/**
 * Phase 10 — Audit enums.
 *
 * These are the exact enums from the approved Phase 10 FINAL specification.
 * Do not add extra values.
 */

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  CANCEL = 'CANCEL',
  REJECT = 'REJECT',
  REVOKE = 'REVOKE',
  ASSIGN = 'ASSIGN',
  RESOLVE = 'RESOLVE',
  PUBLISH = 'PUBLISH',
  EXPIRE = 'EXPIRE',
  ARCHIVE = 'ARCHIVE',
  START = 'START',
  END = 'END',
  VOTE = 'VOTE',
  GENERATE = 'GENERATE',
  MARK_PAID = 'MARK_PAID',
  MARK_OVERDUE = 'MARK_OVERDUE',
  WAIVE_LATE_CHARGE = 'WAIVE_LATE_CHARGE',
  MARK_COMPLETED = 'MARK_COMPLETED',
  MARK_FAILED = 'MARK_FAILED',
  UPLOAD = 'UPLOAD',
}

export enum AuditEntityType {
  BUILDING = 'BUILDING',
  FLOOR = 'FLOOR',
  FLAT = 'FLAT',
  RESIDENT = 'RESIDENT',
  VISITOR = 'VISITOR',
  VISITOR_VISIT = 'VISITOR_VISIT',
  VISITOR_APPROVAL = 'VISITOR_APPROVAL',
  VISITOR_PASS = 'VISITOR_PASS',
  MAINTENANCE_CONFIGURATION = 'MAINTENANCE_CONFIGURATION',
  MAINTENANCE_DUE = 'MAINTENANCE_DUE',
  PAYMENT = 'PAYMENT',
  COMPLAINT = 'COMPLAINT',
  NOTICE = 'NOTICE',
  POLL = 'POLL',
  FILE = 'FILE',
}

export const AUDIT_ACTIONS: AuditAction[] = Object.values(AuditAction);
export const AUDIT_ENTITY_TYPES: AuditEntityType[] = Object.values(
  AuditEntityType,
);
