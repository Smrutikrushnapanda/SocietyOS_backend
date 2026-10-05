import { Entity, PrimaryColumn, Column, ManyToOne } from 'typeorm';
import { Organization } from './organization.entity';
import { User } from './user.entity';

@Entity()
export class Notice {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ length: 255 })
  title: string;

  @Column('text')
  content: string;

  @Column({ length: 20, default: 'DRAFT' })
  status: string;

  @Column({ type: 'timestamp', nullable: true })
  published_at: Date | null;

  @Column({ type: 'timestamp' })
  expires_at: Date;

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
}