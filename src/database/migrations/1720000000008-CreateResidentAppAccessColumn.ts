import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateResidentAppAccessColumn1720000000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'residents' AND column_name = 'app_access_status') THEN
          ALTER TABLE residents ADD COLUMN app_access_status BOOLEAN NOT NULL DEFAULT false;
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'residents' AND column_name = 'app_access_status') THEN
          ALTER TABLE residents DROP COLUMN app_access_status;
        END IF;
      END
      $$;
    `);
  }
}
