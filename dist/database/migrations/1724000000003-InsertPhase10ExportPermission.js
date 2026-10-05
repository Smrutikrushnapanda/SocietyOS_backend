"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsertPhase10ExportPermission1724000000003 = void 0;
class InsertPhase10ExportPermission1724000000003 {
    async up(queryRunner) {
        await queryRunner.query(`
      INSERT INTO permissions (name, description, is_active, created_at, updated_at)
      VALUES
        ('report:export', 'Export organization reports as CSV', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (name) DO NOTHING;
    `);
        await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id, granted_at, created_at, updated_at)
      SELECT r.id, p.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM roles r, permissions p
      WHERE r.name = 'SUPER_ADMIN'
        AND p.name = 'report:export'
      ON CONFLICT DO NOTHING;
    `);
        await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id, granted_at, created_at, updated_at)
      SELECT r.id, p.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM roles r, permissions p
      WHERE r.name = 'SOCIETY_ADMIN'
        AND p.name = 'report:export'
      ON CONFLICT DO NOTHING;
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      DELETE FROM role_permissions WHERE permission_id IN (
        SELECT id FROM permissions WHERE name = 'report:export'
      );
    `);
        await queryRunner.query(`DELETE FROM permissions WHERE name = 'report:export';`);
    }
}
exports.InsertPhase10ExportPermission1724000000003 = InsertPhase10ExportPermission1724000000003;
//# sourceMappingURL=1724000000003-InsertPhase10ExportPermission.js.map