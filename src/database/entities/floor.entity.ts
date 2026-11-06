import { Entity, PrimaryColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Building } from './building.entity';
import { Flat } from './flat.entity';

@Entity('floors')
export class Floor {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'uuid' })
  building_id: string;

  @Column({ type: 'integer' })
  floor_number: number;

  @Column({ length: 255, nullable: true })
  name: string;

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

  @OneToMany(() => Flat, (flat) => flat.floor)
  flats: Flat[];
}
