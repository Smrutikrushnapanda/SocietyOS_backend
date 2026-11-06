import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Organization } from './organization.entity';
import { Flat } from './flat.entity';
import { Resident } from './resident.entity';
import { Vehicle } from './vehicle.entity';

@Entity('parking_slots')
export class ParkingSlot {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'varchar', length: 50 })
  slot_number: string;

  @Column({ type: 'varchar', length: 50, default: 'A' })
  zone: string;

  @Column({ type: 'varchar', length: 20, default: '4W' })
  slot_type: string;

  @Column({ type: 'varchar', length: 20, default: 'AVAILABLE' })
  status: string;

  @Column({ type: 'uuid', nullable: true })
  flat_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  resident_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  vehicle_id: string | null;

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

  @ManyToOne(() => Flat, { nullable: true })
  @JoinColumn({ name: 'flat_id' })
  flat: Flat | null;

  @ManyToOne(() => Resident, { nullable: true })
  @JoinColumn({ name: 'resident_id' })
  resident: Resident | null;

  @ManyToOne(() => Vehicle, { nullable: true })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle | null;
}
