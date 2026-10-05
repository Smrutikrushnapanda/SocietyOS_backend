import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertRoles1718085840000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO roles (name, organization_id, is_active, created_at, updated_at)
      VALUES
        ('SUPER_ADMIN', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('SOCIETY_ADMIN', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('RESIDENT', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('GUARD', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (name, organization_id) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM roles WHERE name IN ('SUPER_ADMIN', 'SOCIETY_ADMIN', 'RESIDENT', 'GUARD');`,
    );
  }
}
