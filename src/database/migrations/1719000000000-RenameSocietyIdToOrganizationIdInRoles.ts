import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameSocietyIdToOrganizationIdInRoles1719000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'society_id') THEN
          ALTER TABLE roles RENAME COLUMN society_id TO organization_id;
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'organization_id') THEN
          ALTER TABLE roles RENAME COLUMN organization_id TO society_id;
        END IF;
      END
      $$;
    `);
  }
}
