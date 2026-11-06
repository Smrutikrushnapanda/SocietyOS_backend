import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Poll } from './poll.entity';
import { Resident } from './resident.entity';

@Entity('poll_option')
export class PollOption {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  poll_id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ length: 255 })
  option_text: string;

  @Column({ default: 0 })
  display_order: number;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_at: Date;

  @ManyToOne(() => Poll)
  @JoinColumn({ name: 'poll_id' })
  poll: Poll;

  @ManyToOne(() => Resident, { nullable: true })
  @JoinColumn({ name: 'resident_id' })
  resident: Resident;
}