import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Building } from './building.entity';
import { Floor } from './floor.entity';
import { Organization } from './organization.entity';

/**
 * A flat identifier is unique within an organization AND building.
 * The same identifier may be reused in a different building (or organization).
 */
@Unique(['organization_id', 'building_id', 'flat_identifier'])
@Entity('flats')
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

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @Column({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @ManyToOne(() => Building, (building) => building.floors)
  @JoinColumn({ name: 'building_id' })
  building: Building;

  @ManyToOne(() => Floor, (floor) => floor.flats)
  @JoinColumn({ name: 'floor_id' })
  floor: Floor;

  @ManyToOne(() => Organization, (org) => org.userRoles)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;
}
