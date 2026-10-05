"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateResidentAppAccessColumn1720000000008 = void 0;
class CreateResidentAppAccessColumn1720000000008 {
    async up(queryRunner) {
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
    async down(queryRunner) {
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
exports.CreateResidentAppAccessColumn1720000000008 = CreateResidentAppAccessColumn1720000000008;
//# sourceMappingURL=1720000000008-CreateResidentAppAccessColumn.js.map