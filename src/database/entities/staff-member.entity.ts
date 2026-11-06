import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Organization } from './organization.entity';
import { User } from './user.entity';

@Entity('staff_members')
export class StaffMember {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'uuid', nullable: true })
  user_id: string | null;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 100 })
  role: string;

  @Column({ length: 50 })
  phone: string;

  @Column({ length: 150, default: 'Main Gate' })
  gate: string;

  @Column({ length: 100, default: 'General (09:00 - 18:00)' })
  shift: string;

  @Column({ length: 30, default: 'Active' })
  status: string; // 'On Duty' | 'Off Duty' | 'Active' | 'Inactive'

  @Column({ name: 'profile_photo_url', type: 'text', nullable: true })
  profile_photo_url: string | null;

  @Column({ name: 'aadhaar_photo_url', type: 'text', nullable: true })
  aadhaar_photo_url: string | null;

  @Column({ name: 'aadhaar_number', type: 'varchar', length: 20, nullable: true })
  aadhaar_number: string | null;

  @Column({ name: 'gender', type: 'varchar', length: 20, nullable: true })
  gender: string | null;

  @Column({ name: 'emergency_contact', type: 'varchar', length: 150, nullable: true })
  emergency_contact: string | null;

  @Column({ name: 'address', type: 'text', nullable: true })
  address: string | null;

  @Column({ name: 'date_of_joining', type: 'varchar', length: 30, nullable: true })
  date_of_joining: string | null;

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

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;
}
