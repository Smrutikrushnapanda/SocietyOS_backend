import { Entity, PrimaryColumn, Column, ManyToOne } from 'typeorm';
import { PollOption } from './poll-option.entity';
import { Resident } from './resident.entity';

@Entity()
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
  option: PollOption;

  @ManyToOne(() => Resident)
  resident: Resident;
}