import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Organization } from './organization.entity';

@Entity('amenities')
export class Amenity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 50 })
  code: string;

  @Column({ length: 50, default: 'pool' })
  icon: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'uuid', nullable: true })
  image_file_id: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  location: string | null;

  @Column({ type: 'int', default: 20 })
  capacity: number;

  @Column({ length: 20, default: '06:00' })
  open_time: string;

  @Column({ length: 20, default: '22:00' })
  close_time: string;

  @Column({ length: 50, default: '60 mins' })
  slot_duration: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  guest_fee: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  status_text: string | null;

  @Column({ length: 50, default: 'Active' })
  status: string; // 'Active' | 'Closed (Maintenance)'

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
}
