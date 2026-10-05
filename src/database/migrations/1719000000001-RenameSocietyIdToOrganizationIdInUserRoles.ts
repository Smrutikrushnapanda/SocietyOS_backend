import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameSocietyIdToOrganizationIdInUserRoles1719000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_roles' AND column_name = 'society_id') THEN
          ALTER TABLE user_roles RENAME COLUMN society_id TO organization_id;
          ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS uq_user_roles_user_society;
          ALTER TABLE user_roles ADD CONSTRAINT uq_user_roles_user_organization UNIQUE (user_id, organization_id);
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_roles' AND column_name = 'organization_id') THEN
          ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS uq_user_roles_user_organization;
          ALTER TABLE user_roles ADD CONSTRAINT uq_user_roles_user_society UNIQUE (user_id, society_id);
          ALTER TABLE user_roles RENAME COLUMN organization_id TO society_id;
        END IF;
      END
      $$;
    `);
  }
}
