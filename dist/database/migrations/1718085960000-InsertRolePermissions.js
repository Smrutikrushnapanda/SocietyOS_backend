"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsertRolePermissions1718085960000 = void 0;
class InsertRolePermissions1718085960000 {
    async up(queryRunner) {
        await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id, granted_at, created_at, updated_at)
      SELECT r.id, p.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM (VALUES ('SUPER_ADMIN'), ('SOCIETY_ADMIN'), ('RESIDENT'), ('GUARD')) AS r_names(name)
      CROSS JOIN (SELECT name FROM permissions) AS p_names(name)
      JOIN roles r ON r.name = r_names.name
      JOIN permissions p ON p.name = p_names.name
      ON CONFLICT DO NOTHING;
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      DELETE FROM role_permissions WHERE role_id IN (
        SELECT id FROM roles WHERE name IN ('SUPER_ADMIN', 'SOCIETY_ADMIN', 'RESIDENT', 'GUARD')
      );
    `);
    }
}
exports.InsertRolePermissions1718085960000 = InsertRolePermissions1718085960000;
//# sourceMappingURL=1718085960000-InsertRolePermissions.js.map