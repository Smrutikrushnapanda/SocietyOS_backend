"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreatePhase8Tables1722000000000 = void 0;
class CreatePhase8Tables1722000000000 {
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS complaints (
        id uuid PRIMARY KEY,
        organization_id uuid NOT NULL,
        resident_id uuid NOT NULL,
        flat_id uuid NOT NULL,
        category varchar(100) NOT NULL,
        subject varchar(255) NOT NULL,
        description text NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'OPEN',
        priority varchar(20) NOT NULL DEFAULT 'MEDIUM',
        assigned_to uuid,
        resolved_at timestamp,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_complaints_organization FOREIGN KEY (organization_id) REFERENCES organizations(id),
        CONSTRAINT fk_complaints_resident FOREIGN KEY (resident_id) REFERENCES residents(id),
        CONSTRAINT fk_complaints_flat FOREIGN KEY (flat_id) REFERENCES flats(id),
        CONSTRAINT fk_complaints_assigned FOREIGN KEY (assigned_to) REFERENCES users(id)
      );
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS complaints_status_history (
        id uuid PRIMARY KEY,
        complaint_id uuid NOT NULL,
        previous_status varchar(20) NOT NULL,
        new_status varchar(20) NOT NULL,
        changed_by uuid NOT NULL,
        changed_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        reason text,
        CONSTRAINT fk_csh_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id),
        CONSTRAINT fk_csh_user FOREIGN KEY (changed_by) REFERENCES users(id)
      );
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notices (
        id uuid PRIMARY KEY,
        organization_id uuid NOT NULL,
        title varchar(255) NOT NULL,
        content text NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'DRAFT',
        published_at timestamp,
        expires_at timestamp,
        created_by uuid NOT NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_notices_organization FOREIGN KEY (organization_id) REFERENCES organizations(id),
        CONSTRAINT fk_notices_created_by FOREIGN KEY (created_by) REFERENCES users(id)
      );
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS poll_options (
        id uuid PRIMARY KEY,
        poll_id uuid NOT NULL,
        organization_id uuid NOT NULL,
        option_text varchar(255) NOT NULL,
        display_order integer NOT NULL DEFAULT 0,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_poll_options_poll FOREIGN KEY (poll_id) REFERENCES polls(id),
        CONSTRAINT fk_poll_options_organization FOREIGN KEY (organization_id) REFERENCES organizations(id)
      );
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS polls (
        id uuid PRIMARY KEY,
        organization_id uuid NOT NULL,
        title varchar(255) NOT NULL,
        description text,
        status varchar(20) NOT NULL DEFAULT 'DRAFT',
        starts_at timestamp NOT NULL,
        ends_at timestamp NOT NULL,
        created_by uuid NOT NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_polls_organization FOREIGN KEY (organization_id) REFERENCES organizations(id),
        CONSTRAINT fk_polls_created_by FOREIGN KEY (created_by) REFERENCES users(id)
      );
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS poll_votes (
        id uuid PRIMARY KEY,
        poll_id uuid NOT NULL,
        option_id uuid NOT NULL,
        resident_id uuid NOT NULL,
        organization_id uuid NOT NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_poll_votes_poll FOREIGN KEY (poll_id) REFERENCES polls(id),
        CONSTRAINT fk_poll_votes_option FOREIGN KEY (option_id) REFERENCES poll_options(id),
        CONSTRAINT fk_poll_votes_resident FOREIGN KEY (resident_id) REFERENCES residents(id),
        CONSTRAINT fk_poll_votes_organization FOREIGN KEY (organization_id) REFERENCES organizations(id),
        CONSTRAINT uq_poll_votes UNIQUE (poll_id, resident_id)
      );
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS poll_votes CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS poll_options CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS polls CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS notices CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS complaints_status_history CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS complaints CASCADE`);
    }
}
exports.CreatePhase8Tables1722000000000 = CreatePhase8Tables1722000000000;
//# sourceMappingURL=1722000000000-CreatePhase8Tables.js.map