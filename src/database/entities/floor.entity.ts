import { Entity, PrimaryColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Building } from './building.entity';
import { Flat } from './flat.entity';

@Entity()
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

  @OneToMany(() => Flat, (flat) => flat.floor)
  flats: Flat[];
}
