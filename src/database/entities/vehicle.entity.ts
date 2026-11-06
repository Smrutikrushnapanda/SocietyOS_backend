import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Organization } from './organization.entity';
import { Resident } from './resident.entity';
import { Flat } from './flat.entity';

@Entity('vehicles')
export class Vehicle {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'uuid' })
  resident_id: string;

  @Column({ type: 'uuid', nullable: true })
  flat_id: string | null;

  @Column({ type: 'varchar', length: 50 })
  registration_number: string;

  @Column({ type: 'varchar', length: 20, default: '4W' })
  vehicle_type: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  make_model: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  color: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  rfid_tag: string | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

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

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Resident)
  @JoinColumn({ name: 'resident_id' })
  resident: Resident;

  @ManyToOne(() => Flat, { nullable: true })
  @JoinColumn({ name: 'flat_id' })
  flat: Flat | null;
}
