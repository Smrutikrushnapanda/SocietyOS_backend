import { Entity, PrimaryColumn, Column, ManyToOne } from 'typeorm';
import { Building } from './building.entity';
import { Floor } from './floor.entity';
import { Organization } from './organization.entity';

@Entity()
export class Flat {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'uuid' })
  building_id: string;

  @Column({ type: 'uuid' })
  floor_id: string;

  @Column({ length: 50 })
  flat_identifier: string;

  @Column({ length: 50, nullable: true })
  flat_type: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1.0 })
  maintenance_multiplier: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @ManyToOne(() => Building, (building) => building.floors)
  building: Building;

  @ManyToOne(() => Floor, (floor) => floor.flats)
  floor: Floor;

  @ManyToOne(() => Organization, (org) => org.userRoles)
  organization: Organization;
}
