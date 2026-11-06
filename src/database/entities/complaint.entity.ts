import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Organization } from './organization.entity';
import { User } from './user.entity';
import { Resident } from './resident.entity';
import { Flat } from './flat.entity';

@Entity('complaint')
export class Complaint {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'uuid' })
  resident_id: string;

  @Column({ type: 'uuid' })
  flat_id: string;

  @Column({ length: 100 })
  category: string;

  @Column({ length: 255 })
  subject: string;

  @Column('text')
  description: string;

  @Column({ length: 20, default: 'OPEN' })
  status: string;

  @Column({ length: 20, default: 'MEDIUM' })
  priority: string;

  @Column({ type: 'uuid', nullable: true })
  assigned_to: string | null;

  @Column({ type: 'timestamp', nullable: true })
  resolved_at: Date | null;

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

  @ManyToOne(() => Resident)
  @JoinColumn({ name: 'resident_id' })
  resident: Resident;

  @ManyToOne(() => Flat)
  @JoinColumn({ name: 'flat_id' })
  flat: Flat;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assigned_to' })
  assignedToUser: User;
}