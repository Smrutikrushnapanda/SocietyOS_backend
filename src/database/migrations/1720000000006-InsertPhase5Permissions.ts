import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertPhase5Permissions1720000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO permissions (name, description, is_active, created_at, updated_at)
      VALUES
        ('building:read', 'Read building information', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('building:manage', 'Manage buildings', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('floor:read', 'Read floor information', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('floor:manage', 'Manage floors', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('flat:read', 'Read flat information', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('flat:manage', 'Manage flats', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('resident:read', 'Read resident information', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('resident:manage', 'Manage residents', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (name) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM permissions WHERE name IN (
        'building:read', 'building:manage', 'floor:read', 'floor:manage',
        'flat:read', 'flat:manage', 'resident:read', 'resident:manage'
      );
    `);
  }
}
