import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 10 - Step 5 (Final Verification): report:manage permission.
 *
 * The approved Phase 10 permission set is exactly:
 *   report:read, report:manage, report:export, audit:read
 *
 * report:manage is defined by the approved specification even though NO
 * endpoint currently requires it (Steps 3/4 use report:read / report:export
 * only). This migration adds the permission record ONLY — no behavior is
 * invented for it and no endpoint references it.
 *
 * Assigned ONLY to SUPER_ADMIN and SOCIETY_ADMIN (RESIDENT / GUARD denied).
 * No schema changes: this migration only touches permission data and is
 * idempotent (ON CONFLICT DO NOTHING).
 */
export class InsertPhase10ReportManagePermission1724000000004
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO permissions (name, description, is_active, created_at, updated_at)
      VALUES
        ('report:manage', 'Manage organization reports', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (name) DO NOTHING;
    `);

    // SUPER_ADMIN
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id, granted_at, created_at, updated_at)
      SELECT r.id, p.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM roles r, permissions p
      WHERE r.name = 'SUPER_ADMIN'
        AND p.name = 'report:manage'
      ON CONFLICT DO NOTHING;
    `);

    // SOCIETY_ADMIN
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id, granted_at, created_at, updated_at)
      SELECT r.id, p.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM roles r, permissions p
      WHERE r.name = 'SOCIETY_ADMIN'
        AND p.name = 'report:manage'
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM role_permissions WHERE permission_id IN (
        SELECT id FROM permissions WHERE name = 'report:manage'
      );
    `);
    await queryRunner.query(
      `DELETE FROM permissions WHERE name = 'report:manage';`,
    );
  }
}