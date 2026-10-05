"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateFloorTable1720000000002 = void 0;
class CreateFloorTable1720000000002 {
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS floors (
        id UUID PRIMARY KEY,
        organization_id UUID NOT NULL,
        building_id UUID NOT NULL,
        floor_number INTEGER NOT NULL,
        name VARCHAR(255),
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_floors_organization FOREIGN KEY (organization_id) REFERENCES organizations(id),
        CONSTRAINT fk_floors_building FOREIGN KEY (building_id) REFERENCES buildings(id)
      );
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS floors;`);
    }
}
exports.CreateFloorTable1720000000002 = CreateFloorTable1720000000002;
//# sourceMappingURL=1720000000003-CreateFloorTable.js.map