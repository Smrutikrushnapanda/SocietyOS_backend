import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrganizationTable1719000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        identifier VARCHAR(255),
        address TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS organizations;`);
  }
}
