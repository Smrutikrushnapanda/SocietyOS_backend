import { Entity, Check, PrimaryColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Organization } from './organization.entity';
import { User } from './user.entity';
import { PollOption } from './poll-option.entity';

@Entity('poll')
@Check('poll_type_valid', "poll_type IN ('SINGLE', 'MULTIPLE')")
export class Poll {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ length: 255 })
  title: string;

  @Column('text')
  description: string | null;

  @Column({ length: 20, default: 'DRAFT' })
  status: string;

  @Column({ length: 10, default: 'SINGLE' })
  poll_type: 'SINGLE' | 'MULTIPLE';

  @Column({ type: 'timestamp' })
  starts_at: Date;

  @Column({ type: 'timestamp' })
  ends_at: Date;

  @Column({ type: 'uuid' })
  created_by: string;

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

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdByUser: User;

  @OneToMany(() => PollOption, (option) => option.poll)
  options: PollOption[];
}
