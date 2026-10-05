"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsertRoles1718085840000 = void 0;
class InsertRoles1718085840000 {
    async up(queryRunner) {
        await queryRunner.query(`
      INSERT INTO roles (name, organization_id, is_active, created_at, updated_at)
      VALUES
        ('SUPER_ADMIN', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('SOCIETY_ADMIN', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('RESIDENT', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('GUARD', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (name, organization_id) DO NOTHING;
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DELETE FROM roles WHERE name IN ('SUPER_ADMIN', 'SOCIETY_ADMIN', 'RESIDENT', 'GUARD');`);
    }
}
exports.InsertRoles1718085840000 = InsertRoles1718085840000;
//# sourceMappingURL=1718085840000-InsertRoles.js.map