import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFlatTable1720000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS flats (
        id UUID PRIMARY KEY,
        organization_id UUID NOT NULL,
        building_id UUID NOT NULL,
        floor_id UUID NOT NULL,
        flat_identifier VARCHAR(50) NOT NULL,
        flat_type VARCHAR(50),
        maintenance_multiplier DECIMAL(10,2) NOT NULL DEFAULT 1.0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_flats_organization FOREIGN KEY (organization_id) REFERENCES organizations(id),
        CONSTRAINT fk_flats_building FOREIGN KEY (building_id) REFERENCES buildings(id),
        CONSTRAINT fk_flats_floor FOREIGN KEY (floor_id) REFERENCES floors(id)
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS flats;`);
  }
}
