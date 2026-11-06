import { Entity, Index, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { PollOption } from './poll-option.entity';
import { Resident } from './resident.entity';

@Entity('poll_vote')
@Index('poll_vote_ballot_option_unique', ['poll_id', 'resident_id', 'option_id'], { unique: true })
export class PollVote {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  poll_id: string;

  @Column({ type: 'uuid' })
  option_id: string;

  @Column({ type: 'uuid' })
  resident_id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_at: Date;

  @ManyToOne(() => PollOption)
  @JoinColumn({ name: 'option_id' })
  option: PollOption;

  @ManyToOne(() => Resident)
  @JoinColumn({ name: 'resident_id' })
  resident: Resident;
}
