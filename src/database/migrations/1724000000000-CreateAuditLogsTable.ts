import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 10 — audit_logs (append-only).
 *
 * No updated_at. No update/delete path. entity_id nullable.
 * Uses organization_id terminology only (no society_id / tenant_id).
 * Indexes mirror the approved Phase 10 specification; the explicit DESC on the
 * created_at index is expressed here. The index names match the entity
 * decorators so synchronize and migrations do not create duplicate indexes.
 */
export class CreateAuditLogsTable1724000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id uuid PRIMARY KEY,
        actor_user_id uuid,
        actor_organization_id uuid,
        target_organization_id uuid,
        action varchar(40) NOT NULL,
        entity_type varchar(40) NOT NULL,
        entity_id uuid,
        old_values jsonb,
        new_values jsonb,
        ip_address varchar(64),
        user_agent text,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_target_org_created_at ON audit_logs(target_organization_id, created_at DESC);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_target_org_action ON audit_logs(target_organization_id, action);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_target_org_entity ON audit_logs(target_organization_id, entity_type, entity_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_user_id ON audit_logs(actor_user_id);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS audit_logs CASCADE;`);
  }
}
