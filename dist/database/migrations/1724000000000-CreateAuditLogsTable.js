"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateAuditLogsTable1724000000000 = void 0;
class CreateAuditLogsTable1724000000000 {
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id uuid PRIMARY KEY,
        actor_user_id uuid,
        actor_organization_id uuid,
        target_organization_id uuid,
        action varchar(40) NOT NULL,
        entity_type varchar(40) NOT NULL,
        entity_id uuid,
        old_values jsonb,
        new_values jsonb,
        ip_address varchar(64),
        user_agent text,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_target_org_created_at ON audit_logs(target_organization_id, created_at DESC);`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_target_org_action ON audit_logs(target_organization_id, action);`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_target_org_entity ON audit_logs(target_organization_id, entity_type, entity_id);`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_user_id ON audit_logs(actor_user_id);`);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS audit_logs CASCADE;`);
    }
}
exports.CreateAuditLogsTable1724000000000 = CreateAuditLogsTable1724000000000;
//# sourceMappingURL=1724000000000-CreateAuditLogsTable.js.map