"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreatePermissions1718085660000 = void 0;
class CreatePermissions1718085660000 {
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uc_permissions_name UNIQUE (name)
      );
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS permissions;`);
    }
}
exports.CreatePermissions1718085660000 = CreatePermissions1718085660000;
//# sourceMappingURL=1718085660000-CreatePermissions.js.map