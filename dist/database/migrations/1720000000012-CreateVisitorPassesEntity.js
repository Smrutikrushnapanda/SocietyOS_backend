"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateVisitorPassesEntity1720000000012 = void 0;
class CreateVisitorPassesEntity1720000000012 {
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE visitor_passes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        visitor_id UUID NOT NULL,
        visitor_visit_id UUID,
        issuer VARCHAR(255),
        pass_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        validity_start TIMESTAMP NOT NULL,
        validity_end TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_visitor_pass_visitor FOREIGN KEY (visitor_id) REFERENCES visitors(id) ON DELETE CASCADE,
        CONSTRAINT fk_visitor_pass_visit FOREIGN KEY (visitor_visit_id) REFERENCES visitor_visits(id)
      );
    `);
        await queryRunner.query(`CREATE INDEX idx_visitor_passes_organization ON visitor_passes(organization_id);`);
        await queryRunner.query(`CREATE INDEX idx_visitor_passes_visitor ON visitor_passes(visitor_id);`);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX IF EXISTS idx_visitor_passes_visitor;`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_visitor_passes_organization;`);
        await queryRunner.query(`DROP TABLE IF EXISTS visitor_passes CASCADE;`);
    }
}
exports.CreateVisitorPassesEntity1720000000012 = CreateVisitorPassesEntity1720000000012;
//# sourceMappingURL=1720000000012-CreateVisitorPassesEntity.js.map