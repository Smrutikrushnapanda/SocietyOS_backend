import { Entity, PrimaryColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Organization } from './organization.entity';
import { Floor } from './floor.entity';

@Entity()
export class Building {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 100, nullable: true })
  code: string;

  @Column({ type: 'integer', nullable: true })
  totalFloors: number;

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

  @ManyToOne(() => Organization, (org) => org.userRoles)
  organization: Organization;

  @OneToMany(() => Floor, (floor) => floor.building)
  floors: Floor[];
}
