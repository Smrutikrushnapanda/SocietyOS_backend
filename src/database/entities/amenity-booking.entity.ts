import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Organization } from './organization.entity';
import { Amenity } from './amenity.entity';

@Entity('amenity_bookings')
export class AmenityBooking {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'uuid', nullable: true })
  amenity_id: string | null;

  @Column({ length: 150 })
  amenity: string;

  @Column({ type: 'uuid', nullable: true })
  resident_id: string | null;

  @Column({ length: 150 })
  resident: string;

  @Column({ length: 50 })
  flat: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ length: 50 })
  slot: string;

  @Column({ type: 'int', default: 1 })
  guests: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  amount: number;

  @Column({ length: 30, default: 'Pending' })
  status: string;

  @Column({ type: 'uuid', nullable: true }) approved_by: string | null;
  @Column({ type: 'timestamp', nullable: true }) approved_at: Date | null;
  @Column({ type: 'uuid', nullable: true }) rejected_by: string | null;
  @Column({ type: 'timestamp', nullable: true }) rejected_at: Date | null;
  @Column({ type: 'uuid', nullable: true }) cancelled_by: string | null;
  @Column({ type: 'timestamp', nullable: true }) cancelled_at: Date | null;
  @Column({ type: 'uuid', nullable: true }) revoked_by: string | null;
  @Column({ type: 'timestamp', nullable: true }) revoked_at: Date | null;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_at: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Amenity, { nullable: true })
  @JoinColumn({ name: 'amenity_id' })
  amenityEntity: Amenity | null;
}
