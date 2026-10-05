import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 10 - Step 4 (CSV Exports): report:export permission.
 *
 * Assigned ONLY to SUPER_ADMIN and SOCIETY_ADMIN (RESIDENT / GUARD denied).
 * report:manage is intentionally NOT added (not required by the architecture).
 * No schema changes: this migration only touches permission data and is
 * idempotent (ON CONFLICT DO NOTHING).
 */
export class InsertPhase10ExportPermission1724000000003
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO permissions (name, description, is_active, created_at, updated_at)
      VALUES
        ('report:export', 'Export organization reports as CSV', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (name) DO NOTHING;
    `);

    // SUPER_ADMIN
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id, granted_at, created_at, updated_at)
      SELECT r.id, p.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM roles r, permissions p
      WHERE r.name = 'SUPER_ADMIN'
        AND p.name = 'report:export'
      ON CONFLICT DO NOTHING;
    `);

    // SOCIETY_ADMIN
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id, granted_at, created_at, updated_at)
      SELECT r.id, p.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM roles r, permissions p
      WHERE r.name = 'SOCIETY_ADMIN'
        AND p.name = 'report:export'
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM role_permissions WHERE permission_id IN (
        SELECT id FROM permissions WHERE name = 'report:export'
      );
    `);
    await queryRunner.query(
      `DELETE FROM permissions WHERE name = 'report:export';`,
    );
  }
}
