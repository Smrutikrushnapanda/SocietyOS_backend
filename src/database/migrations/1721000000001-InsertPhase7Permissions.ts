import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertPhase7Permissions1721000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert Phase 7 permissions
    await queryRunner.query(`
      INSERT INTO permissions (name, description, is_active, created_at, updated_at)
      VALUES
        ('maintenance:read', 'Read maintenance configuration and dues', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('maintenance:manage', 'Manage maintenance configuration', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('due:read', 'Read maintenance dues records', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('due:manage', 'Manage maintenance dues (status changes)', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('payment:read', 'Read payment records', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('payment:manage', 'Manage payment records', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('late_charge:waive', 'Waive late charge on a due', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (name) DO NOTHING;
    `);

    // Assign permissions to SUPER_ADMIN role
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id, granted_at, created_at, updated_at)
      SELECT r.id, p.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM roles r, permissions p
      WHERE r.name = 'SUPER_ADMIN'
        AND p.name IN (
          'maintenance:read', 'maintenance:manage', 'due:read', 'due:manage',
          'payment:read', 'payment:manage', 'late_charge:waive'
        )
      ON CONFLICT DO NOTHING;
    `);

    // Assign permissions to SOCIETY_ADMIN role
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id, granted_at, created_at, updated_at)
      SELECT r.id, p.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM roles r, permissions p
      WHERE r.name = 'SOCIETY_ADMIN'
        AND p.name IN (
          'maintenance:read', 'maintenance:manage', 'due:read', 'due:manage',
          'payment:read', 'payment:manage', 'late_charge:waive'
        )
      ON CONFLICT DO NOTHING;
    `);

    // Assign permissions to RESIDENT role (read-only)
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id, granted_at, created_at, updated_at)
      SELECT r.id, p.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM roles r, permissions p
      WHERE r.name = 'RESIDENT'
        AND p.name IN (
          'maintenance:read', 'due:read', 'payment:read'
        )
      ON CONFLICT DO NOTHING;
    `);

    // GUARD intentionally has no maintenance/payment permissions
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove Phase 7 permissions from SUPER_ADMIN
    await queryRunner.query(`
      DELETE FROM role_permissions WHERE role_id IN (
        SELECT id FROM roles WHERE name = 'SUPER_ADMIN'
      ) AND permission_id IN (
        SELECT id FROM permissions WHERE name IN (
          'maintenance:read', 'maintenance:manage', 'due:read', 'due:manage',
          'payment:read', 'payment:manage', 'late_charge:waive'
        )
      );
    `);

    // Remove permissions from SOCIETY_ADMIN
    await queryRunner.query(`
      DELETE FROM role_permissions WHERE role_id IN (
        SELECT id FROM roles WHERE name = 'SOCIETY_ADMIN'
      ) AND permission_id IN (
        SELECT id FROM permissions WHERE name IN (
          'maintenance:read', 'maintenance:manage', 'due:read', 'due:manage',
          'payment:read', 'payment:manage', 'late_charge:waive'
        )
      );
    `);

    // Remove permissions from RESIDENT
    await queryRunner.query(`
      DELETE FROM role_permissions WHERE role_id IN (
        SELECT id FROM roles WHERE name = 'RESIDENT'
      ) AND permission_id IN (
        SELECT id FROM permissions WHERE name IN (
          'maintenance:read', 'due:read', 'payment:read'
        )
      );
    `);

    // Delete Phase 7 permissions
    await queryRunner.query(`
      DELETE FROM permissions WHERE name IN (
        'maintenance:read', 'maintenance:manage', 'due:read', 'due:manage',
        'payment:read', 'payment:manage', 'late_charge:waive'
      )
    `);
  }
}
