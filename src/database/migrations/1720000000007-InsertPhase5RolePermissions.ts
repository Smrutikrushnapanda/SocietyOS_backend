import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertPhase5RolePermissions1720000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id, granted_at, created_at, updated_at)
      SELECT r.id, p.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM (VALUES ('SUPER_ADMIN'), ('SOCIETY_ADMIN'), ('RESIDENT')) AS r_names(name)
      CROSS JOIN (SELECT name FROM permissions WHERE name IN (
        'building:read', 'building:manage', 'floor:read', 'floor:manage',
        'flat:read', 'flat:manage', 'resident:read', 'resident:manage'
      )) AS p_names(name)
      JOIN roles r ON r.name = r_names.name
      JOIN permissions p ON p.name = p_names.name
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM role_permissions WHERE role_id IN (
        SELECT id FROM roles WHERE name IN ('SUPER_ADMIN', 'SOCIETY_ADMIN', 'RESIDENT')
      ) AND permission_id IN (
        SELECT id FROM permissions WHERE name IN (
          'building:read', 'building:manage', 'floor:read', 'floor:manage',
          'flat:read', 'flat:manage', 'resident:read', 'resident:manage'
        )
      );
    `);
  }
}