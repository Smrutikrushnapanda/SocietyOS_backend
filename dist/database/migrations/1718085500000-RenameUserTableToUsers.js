"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RenameUserTableToUsers1718085500000 = void 0;
class RenameUserTableToUsers1718085500000 {
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE IF EXISTS "user" RENAME TO "users";
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE IF EXISTS "users" RENAME TO "user";
    `);
    }
}
exports.RenameUserTableToUsers1718085500000 = RenameUserTableToUsers1718085500000;
//# sourceMappingURL=1718085500000-RenameUserTableToUsers.js.map