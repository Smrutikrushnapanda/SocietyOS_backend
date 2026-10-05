"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateVisitorApprovalsEntity1720000000011 = void 0;
class CreateVisitorApprovalsEntity1720000000011 {
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS visitor_approvals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        visitor_visit_id UUID NOT NULL,
        approver_id UUID,
        approval_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        approved_at TIMESTAMP,
        rejected_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_visitor_approval_visit FOREIGN KEY (visitor_visit_id) REFERENCES visitor_visits(id) ON DELETE CASCADE,
        CONSTRAINT fk_visitor_approval_org FOREIGN KEY (organization_id) REFERENCES visitors(id)
      );
    `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_visitor_approvals_organization ON visitor_approvals(organization_id);`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_visitor_approvals_visit ON visitor_approvals(visitor_visit_id);`);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX IF EXISTS idx_visitor_approvals_visit;`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_visitor_approvals_organization;`);
        await queryRunner.query(`DROP TABLE IF EXISTS visitor_approvals CASCADE;`);
    }
}
exports.CreateVisitorApprovalsEntity1720000000011 = CreateVisitorApprovalsEntity1720000000011;
//# sourceMappingURL=1720000000011-CreateVisitorApprovalsEntity.js.map