"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsertPhase10ReportPermission1724000000002 = void 0;
class InsertPhase10ReportPermission1724000000002 {
    async up(queryRunner) {
        await queryRunner.query(`
      INSERT INTO permissions (name, description, is_active, created_at, updated_at)
      VALUES
        ('report:read', 'Read organization reports', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (name) DO NOTHING;
    `);
        await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id, granted_at, created_at, updated_at)
      SELECT r.id, p.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM roles r, permissions p
      WHERE r.name = 'SUPER_ADMIN'
        AND p.name = 'report:read'
      ON CONFLICT DO NOTHING;
    `);
        await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id, granted_at, created_at, updated_at)
      SELECT r.id, p.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM roles r, permissions p
      WHERE r.name = 'SOCIETY_ADMIN'
        AND p.name = 'report:read'
      ON CONFLICT DO NOTHING;
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      DELETE FROM role_permissions WHERE permission_id IN (
        SELECT id FROM permissions WHERE name = 'report:read'
      );
    `);
        await queryRunner.query(`DELETE FROM permissions WHERE name = 'report:read';`);
    }
}
exports.InsertPhase10ReportPermission1724000000002 = InsertPhase10ReportPermission1724000000002;
//# sourceMappingURL=1724000000002-InsertPhase10ReportPermission.js.map