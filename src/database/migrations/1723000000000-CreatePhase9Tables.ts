import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePhase9Tables1723000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id uuid PRIMARY KEY,
        organization_id uuid NOT NULL,
        recipient_user_id uuid NOT NULL,
        type varchar(50) NOT NULL,
        title varchar(255) NOT NULL,
        body text NOT NULL,
        data jsonb,
        is_read boolean NOT NULL DEFAULT false,
        read_at timestamp,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_notifications_organization FOREIGN KEY (organization_id) REFERENCES organizations(id),
        CONSTRAINT fk_notifications_user FOREIGN KEY (recipient_user_id) REFERENCES users(id)
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_notifications_org_user ON notifications(organization_id, recipient_user_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS push_tokens (
        id uuid PRIMARY KEY,
        user_id uuid NOT NULL,
        organization_id uuid NOT NULL,
        token text NOT NULL,
        platform varchar(10) NOT NULL DEFAULT 'WEB',
        is_active boolean NOT NULL DEFAULT true,
        last_seen_at timestamp,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_push_tokens_user FOREIGN KEY (user_id) REFERENCES users(id),
        CONSTRAINT fk_push_tokens_organization FOREIGN KEY (organization_id) REFERENCES organizations(id),
        CONSTRAINT uq_push_tokens_user_token UNIQUE (user_id, token)
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_push_tokens_org ON push_tokens(organization_id);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS file_metadata (
        id uuid PRIMARY KEY,
        organization_id uuid NOT NULL,
        uploaded_by uuid NOT NULL,
        original_filename varchar(255) NOT NULL,
        stored_key varchar(512) NOT NULL,
        mime_type varchar(100) NOT NULL,
        size_bytes integer NOT NULL,
        storage_provider varchar(50) NOT NULL DEFAULT 'LOCAL',
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_file_metadata_organization FOREIGN KEY (organization_id) REFERENCES organizations(id),
        CONSTRAINT fk_file_metadata_user FOREIGN KEY (uploaded_by) REFERENCES users(id)
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_file_metadata_org ON file_metadata(organization_id);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_file_metadata_uploaded_by ON file_metadata(uploaded_by);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS file_metadata CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS push_tokens CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS notifications CASCADE;`);
  }
}
