"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateBuildingTable1720000000001 = void 0;
class CreateBuildingTable1720000000001 {
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS buildings (
        id UUID PRIMARY KEY,
        organization_id UUID NOT NULL,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(100),
        total_floors INTEGER,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_buildings_organization FOREIGN KEY (organization_id) REFERENCES organizations(id)
      );
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS buildings;`);
    }
}
exports.CreateBuildingTable1720000000001 = CreateBuildingTable1720000000001;
//# sourceMappingURL=1720000000001-CreateBuildingTable.js.map