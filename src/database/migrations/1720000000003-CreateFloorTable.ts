import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFloorTable1720000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS floors (
        id UUID PRIMARY KEY,
        organization_id UUID NOT NULL,
        building_id UUID NOT NULL,
        floor_number INTEGER NOT NULL,
        name VARCHAR(255),
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_floors_organization FOREIGN KEY (organization_id) REFERENCES organizations(id),
        CONSTRAINT fk_floors_building FOREIGN KEY (building_id) REFERENCES buildings(id)
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS floors;`);
  }
}
