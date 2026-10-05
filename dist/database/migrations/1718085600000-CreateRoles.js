"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateRoles1718085600000 = void 0;
class CreateRoles1718085600000 {
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        society_id UUID,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uc_roles_name_society_id UNIQUE (name, society_id)
      );
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS roles;`);
    }
}
exports.CreateRoles1718085600000 = CreateRoles1718085600000;
//# sourceMappingURL=1718085600000-CreateRoles.js.map