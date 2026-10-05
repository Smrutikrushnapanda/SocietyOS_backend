import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 10 — audit:read permission.
 *
 * Assigned ONLY to SUPER_ADMIN and SOCIETY_ADMIN.
 * No report/export permissions are added in this step.
 */
export class InsertPhase10AuditPermission1724000000001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO permissions (name, description, is_active, created_at, updated_at)
      VALUES
        ('audit:read', 'Read organization audit logs', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (name) DO NOTHING;
    `);

    // SUPER_ADMIN
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id, granted_at, created_at, updated_at)
      SELECT r.id, p.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM roles r, permissions p
      WHERE r.name = 'SUPER_ADMIN'
        AND p.name = 'audit:read'
      ON CONFLICT DO NOTHING;
    `);

    // SOCIETY_ADMIN
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id, granted_at, created_at, updated_at)
      SELECT r.id, p.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM roles r, permissions p
      WHERE r.name = 'SOCIETY_ADMIN'
        AND p.name = 'audit:read'
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM role_permissions WHERE permission_id IN (
        SELECT id FROM permissions WHERE name = 'audit:read'
      );
    `);
    await queryRunner.query(
      `DELETE FROM permissions WHERE name = 'audit:read';`,
    );
  }
}
