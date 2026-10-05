import { Entity, PrimaryColumn, Column, ManyToOne } from 'typeorm';
import { Organization } from './organization.entity';
import { User } from './user.entity';
import { Resident } from './resident.entity';
import { Flat } from './flat.entity';

@Entity()
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
  organization: Organization;

  @ManyToOne(() => Resident)
  resident: Resident;

  @ManyToOne(() => Flat)
  flat: Flat;

  @ManyToOne(() => User)
  assignedToUser: User;
}