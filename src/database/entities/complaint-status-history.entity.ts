import { Entity, PrimaryColumn, Column, ManyToOne } from 'typeorm';
import { Complaint } from './complaint.entity';
import { User } from './user.entity';

@Entity()
export class ComplaintStatusHistory {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  complaint_id: string;

  @Column({ length: 20 })
  previous_status: string;

  @Column({ length: 20 })
  new_status: string;

  @Column({ type: 'uuid' })
  changed_by: string;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  changed_at: Date;

  @Column('text')
  reason: string | null;

  @ManyToOne(() => Complaint)
  complaint: Complaint;

  @ManyToOne(() => User)
  changedByUser: User;
}