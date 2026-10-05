import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertRolePermissions1718085960000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id, granted_at, created_at, updated_at)
      SELECT r.id, p.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM (VALUES ('SUPER_ADMIN'), ('SOCIETY_ADMIN'), ('RESIDENT'), ('GUARD')) AS r_names(name)
      CROSS JOIN (SELECT name FROM permissions) AS p_names(name)
      JOIN roles r ON r.name = r_names.name
      JOIN permissions p ON p.name = p_names.name
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM role_permissions WHERE role_id IN (
        SELECT id FROM roles WHERE name IN ('SUPER_ADMIN', 'SOCIETY_ADMIN', 'RESIDENT', 'GUARD')
      );
    `);
  }
}