import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Complaint } from './complaint.entity';
import { User } from './user.entity';

@Entity('complaint_status_history')
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

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @ManyToOne(() => Complaint)
  @JoinColumn({ name: 'complaint_id' })
  complaint: Complaint;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'changed_by' })
  changedByUser: User;
}
