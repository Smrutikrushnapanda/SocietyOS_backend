"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsertPhase5Permissions1720000000001 = void 0;
class InsertPhase5Permissions1720000000001 {
    async up(queryRunner) {
        await queryRunner.query(`
      INSERT INTO permissions (name, description, is_active, created_at, updated_at)
      VALUES
        ('building:read', 'Read building information', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('building:manage', 'Manage buildings', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('floor:read', 'Read floor information', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('floor:manage', 'Manage floors', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('flat:read', 'Read flat information', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('flat:manage', 'Manage flats', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('resident:read', 'Read resident information', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('resident:manage', 'Manage residents', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (name) DO NOTHING;
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      DELETE FROM permissions WHERE name IN (
        'building:read', 'building:manage', 'floor:read', 'floor:manage',
        'flat:read', 'flat:manage', 'resident:read', 'resident:manage'
      );
    `);
    }
}
exports.InsertPhase5Permissions1720000000001 = InsertPhase5Permissions1720000000001;
//# sourceMappingURL=1720000000006-InsertPhase5Permissions.js.map