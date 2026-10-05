import { Entity, PrimaryColumn, Column, Index } from 'typeorm';
import { AuditAction, AuditEntityType } from './audit.enums';

/**
 * Append-only audit log.
 *
 * - Uses organization_id terminology only. Never society_id / tenant_id.
 * - entity_id is intentionally nullable (future/system-level events).
 * - There is NO updated_at, NO update path, NO delete path.
 *
 * Indexes mirror the approved Phase 10 specification:
 *   (target_organization_id, created_at DESC)
 *   (target_organization_id, action)
 *   (target_organization_id, entity_type, entity_id)
 *   (actor_user_id)
 *
 * Note: TypeORM's @Index decorator cannot express a DESC sort order, so the
 * synchronize-managed index is a standard btree on
 * (target_organization_id, created_at). PostgreSQL serves
 * `ORDER BY created_at DESC` from this index via a backward index scan, so the
 * DESC ordering requirement is satisfied semantically. The explicit
 * `... created_at DESC` DDL lives in the migration (same index name, so no
 * duplicate index is created).
 */
@Entity('audit_logs')
@Index('idx_audit_logs_target_org_created_at', [
  'target_organization_id',
  'created_at',
])
@Index('idx_audit_logs_target_org_action', ['target_organization_id', 'action'])
@Index('idx_audit_logs_target_org_entity', [
  'target_organization_id',
  'entity_type',
  'entity_id',
])
@Index('idx_audit_logs_actor_user_id', ['actor_user_id'])
export class AuditLog {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  actor_user_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  actor_organization_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  target_organization_id: string | null;

  @Column({ type: 'varchar', length: 40 })
  action: AuditAction;

  @Column({ type: 'varchar', length: 40 })
  entity_type: AuditEntityType;

  @Column({ type: 'uuid', nullable: true })
  entity_id: string | null;

  @Column({ type: 'jsonb', nullable: true })
  old_values: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  new_values: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip_address: string | null;

  @Column({ type: 'text', nullable: true })
  user_agent: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
