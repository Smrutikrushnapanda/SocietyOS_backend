"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsertPhase8Permissions1722000000001 = void 0;
class InsertPhase8Permissions1722000000001 {
    async up(queryRunner) {
        await queryRunner.query(`
      INSERT INTO permissions (name, description, is_active, created_at, updated_at)
      VALUES
        ('complaint:create', 'Create a new complaint', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('complaint:read', 'Read complaints', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('complaint:manage', 'Manage complaints (assign, resolve)', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('notice:read', 'Read notices', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('notice:publish', 'Publish a notice', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('poll:read', 'Read polls', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('poll:vote', 'Vote in a poll', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('poll:manage', 'Manage polls (create, close)', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (name) DO NOTHING;
    `);
        await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id, granted_at, created_at, updated_at)
      SELECT r.id, p.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM roles r, permissions p
      WHERE r.name = 'SUPER_ADMIN'
        AND p.name IN (
          'complaint:create', 'complaint:read', 'complaint:manage',
          'notice:read', 'notice:publish',
          'poll:read', 'poll:vote', 'poll:manage'
        )
      ON CONFLICT DO NOTHING;
    `);
        await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id, granted_at, created_at, updated_at)
      SELECT r.id, p.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM roles r, permissions p
      WHERE r.name = 'SOCIETY_ADMIN'
        AND p.name IN (
          'complaint:create', 'complaint:read', 'complaint:manage',
          'notice:read', 'notice:publish',
          'poll:read', 'poll:vote', 'poll:manage'
        )
      ON CONFLICT DO NOTHING;
    `);
        await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id, granted_at, created_at, updated_at)
      SELECT r.id, p.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM roles r, permissions p
      WHERE r.name = 'RESIDENT'
        AND p.name IN (
          'complaint:read', 'notice:read', 'poll:read', 'poll:vote'
        )
      ON CONFLICT DO NOTHING;
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      DELETE FROM role_permissions WHERE role_id IN (
        SELECT id FROM roles WHERE name = 'SUPER_ADMIN'
      ) AND permission_id IN (
        SELECT id FROM permissions WHERE name IN (
          'complaint:create', 'complaint:read', 'complaint:manage',
          'notice:read', 'notice:publish',
          'poll:read', 'poll:vote', 'poll:manage'
        )
      );
    `);
        await queryRunner.query(`
      DELETE FROM role_permissions WHERE role_id IN (
        SELECT id FROM roles WHERE name = 'SOCIETY_ADMIN'
      ) AND permission_id IN (
        SELECT id FROM permissions WHERE name IN (
          'complaint:create', 'complaint:read', 'complaint:manage',
          'notice:read', 'notice:publish',
          'poll:read', 'poll:vote', 'poll:manage'
        )
      );
    `);
        await queryRunner.query(`
      DELETE FROM role_permissions WHERE role_id IN (
        SELECT id FROM roles WHERE name = 'RESIDENT'
      ) AND permission_id IN (
        SELECT id FROM permissions WHERE name IN (
          'complaint:read', 'notice:read', 'poll:read', 'poll:vote'
        )
      );
    `);
        await queryRunner.query(`
      DELETE FROM permissions WHERE name IN (
        'complaint:create', 'complaint:read', 'complaint:manage',
        'notice:read', 'notice:publish',
        'poll:read', 'poll:vote', 'poll:manage'
      )
    `);
    }
}
exports.InsertPhase8Permissions1722000000001 = InsertPhase8Permissions1722000000001;
//# sourceMappingURL=1722000000001-InsertPhase8Permissions.js.map