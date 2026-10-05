import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameUserTableToUsers1718085500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // The 'user' table was created by TypeORM synchronize before the migration
    // system was in place. All subsequent migrations reference 'users' (plural).
    // Rename it so FK constraints resolve correctly.
    await queryRunner.query(`
      ALTER TABLE IF EXISTS "user" RENAME TO "users";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS "users" RENAME TO "user";
    `);
  }
}
