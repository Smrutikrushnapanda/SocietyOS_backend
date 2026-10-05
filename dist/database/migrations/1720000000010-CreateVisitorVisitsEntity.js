"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateVisitorVisitsEntity1720000000010 = void 0;
class CreateVisitorVisitsEntity1720000000010 {
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS visitor_visits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        visitor_id UUID NOT NULL,
        visit_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        visit_purpose VARCHAR(255),
        expected_entry_time TIMESTAMP,
        actual_entry_time TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_visitor_visit_visitor FOREIGN KEY (visitor_id) REFERENCES visitors(id) ON DELETE CASCADE
      );
    `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_visitor_visits_organization ON visitor_visits(organization_id);`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_visitor_visits_visitor ON visitor_visits(visitor_id);`);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX IF EXISTS idx_visitor_visits_visitor;`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_visitor_visits_organization;`);
        await queryRunner.query(`DROP TABLE IF EXISTS visitor_visits CASCADE;`);
    }
}
exports.CreateVisitorVisitsEntity1720000000010 = CreateVisitorVisitsEntity1720000000010;
//# sourceMappingURL=1720000000010-CreateVisitorVisitsEntity.js.map