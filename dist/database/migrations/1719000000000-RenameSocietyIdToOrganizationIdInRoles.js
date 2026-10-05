"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RenameSocietyIdToOrganizationIdInRoles1719000000000 = void 0;
class RenameSocietyIdToOrganizationIdInRoles1719000000000 {
    async up(queryRunner) {
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
    async down(queryRunner) {
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
exports.RenameSocietyIdToOrganizationIdInRoles1719000000000 = RenameSocietyIdToOrganizationIdInRoles1719000000000;
//# sourceMappingURL=1719000000000-RenameSocietyIdToOrganizationIdInRoles.js.map