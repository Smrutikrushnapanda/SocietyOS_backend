"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsertPermissions1718085900000 = void 0;
class InsertPermissions1718085900000 {
    async up(queryRunner) {
        await queryRunner.query(`
      INSERT INTO permissions (name, description, is_active, created_at, updated_at)
      VALUES
        ('society:read', 'Read society information', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('society:manage', 'Manage society settings', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('user:read', 'Read user information', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('complaint:submit', 'Submit complaints', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('notice:read', 'Read notices', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (name) DO NOTHING;
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      DELETE FROM permissions WHERE name IN ('society:read', 'society:manage', 'user:read', 'complaint:submit', 'notice:read');
    `);
    }
}
exports.InsertPermissions1718085900000 = InsertPermissions1718085900000;
//# sourceMappingURL=1718085900000-InsertPermissions.js.map