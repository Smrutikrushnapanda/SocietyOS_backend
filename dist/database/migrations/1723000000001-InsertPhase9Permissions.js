"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsertPhase9Permissions1723000000001 = void 0;
class InsertPhase9Permissions1723000000001 {
    async up(queryRunner) {
        await queryRunner.query(`
      INSERT INTO permissions (name, description, is_active, created_at, updated_at)
      VALUES
        ('notification:read',   'Read own notifications',                    true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('notification:manage', 'Manage/send system notifications',          true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('push_token:manage',   'Register and manage own push tokens',       true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('file:read',           'Read/download files in own organization',   true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('file:upload',         'Upload files in own organization',          true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('file:manage',         'Manage/delete files in own organization',   true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (name) DO NOTHING;
    `);
        await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id, granted_at, created_at, updated_at)
      SELECT r.id, p.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM roles r, permissions p
      WHERE r.name = 'SUPER_ADMIN'
        AND p.name IN ('notification:read','notification:manage','push_token:manage','file:read','file:upload','file:manage')
      ON CONFLICT DO NOTHING;
    `);
        await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id, granted_at, created_at, updated_at)
      SELECT r.id, p.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM roles r, permissions p
      WHERE r.name = 'SOCIETY_ADMIN'
        AND p.name IN ('notification:read','notification:manage','push_token:manage','file:read','file:upload','file:manage')
      ON CONFLICT DO NOTHING;
    `);
        await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id, granted_at, created_at, updated_at)
      SELECT r.id, p.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM roles r, permissions p
      WHERE r.name = 'RESIDENT'
        AND p.name IN ('notification:read','push_token:manage','file:read','file:upload')
      ON CONFLICT DO NOTHING;
    `);
        await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id, granted_at, created_at, updated_at)
      SELECT r.id, p.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM roles r, permissions p
      WHERE r.name = 'GUARD'
        AND p.name IN ('push_token:manage')
      ON CONFLICT DO NOTHING;
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      DELETE FROM role_permissions WHERE permission_id IN (
        SELECT id FROM permissions WHERE name IN (
          'notification:read','notification:manage','push_token:manage',
          'file:read','file:upload','file:manage'
        )
      );
    `);
        await queryRunner.query(`
      DELETE FROM permissions WHERE name IN (
        'notification:read','notification:manage','push_token:manage',
        'file:read','file:upload','file:manage'
      );
    `);
    }
}
exports.InsertPhase9Permissions1723000000001 = InsertPhase9Permissions1723000000001;
//# sourceMappingURL=1723000000001-InsertPhase9Permissions.js.map