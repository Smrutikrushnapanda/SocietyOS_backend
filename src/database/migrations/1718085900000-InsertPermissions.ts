import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertPermissions1718085900000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO permissions (name, description, is_active, created_at, updated_at)
      VALUES
        ('society:read', 'Read society information', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('society:manage', 'Manage society settings', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('user:read', 'Read user information', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('complaint:submit', 'Submit complaints', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('notice:read', 'Read notices', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (name) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM permissions WHERE name IN ('society:read', 'society:manage', 'user:read', 'complaint:submit', 'notice:read');
    `);
  }
}
