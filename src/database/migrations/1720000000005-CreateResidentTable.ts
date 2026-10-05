import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateResidentTable1720000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS residents (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL,
        organization_id UUID NOT NULL,
        flat_id UUID,
        kyc_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_residents_user FOREIGN KEY (user_id) REFERENCES users(id),
        CONSTRAINT fk_residents_organization FOREIGN KEY (organization_id) REFERENCES organizations(id),
        CONSTRAINT fk_residents_flat FOREIGN KEY (flat_id) REFERENCES flats(id)
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS residents;`);
  }
}
