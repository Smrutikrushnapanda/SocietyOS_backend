import { Entity, PrimaryColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Organization } from './organization.entity';
import { User } from './user.entity';
import { PollOption } from './poll-option.entity';

@Entity()
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
  organization: Organization;

  @ManyToOne(() => User)
  createdByUser: User;

  @OneToMany(() => PollOption, (option) => option.poll)
  options: PollOption[];
}