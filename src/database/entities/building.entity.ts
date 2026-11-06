import { Entity, PrimaryColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Organization } from './organization.entity';
import { Floor } from './floor.entity';

@Entity('buildings')
export class Building {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 100, nullable: true })
  code: string;

  @Column({ name: 'total_floors', type: 'integer', nullable: true })
  totalFloors: number;

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

  @ManyToOne(() => Organization, (org) => org.userRoles)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @OneToMany(() => Floor, (floor) => floor.building)
  floors: Floor[];
}
