"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateVisitorEntity1720000000009 = void 0;
class CreateVisitorEntity1720000000009 {
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS visitors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        name VARCHAR(255) NOT NULL,
        mobile VARCHAR(255) NOT NULL,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS visitors CASCADE;`);
    }
}
exports.CreateVisitorEntity1720000000009 = CreateVisitorEntity1720000000009;
//# sourceMappingURL=1720000000009-CreateVisitorEntity.js.map