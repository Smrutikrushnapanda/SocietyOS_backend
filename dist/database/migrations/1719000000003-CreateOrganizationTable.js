"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateOrganizationTable1719000000002 = void 0;
class CreateOrganizationTable1719000000002 {
    async up(queryRunner) {
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
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS organizations;`);
    }
}
exports.CreateOrganizationTable1719000000002 = CreateOrganizationTable1719000000002;
//# sourceMappingURL=1719000000003-CreateOrganizationTable.js.map