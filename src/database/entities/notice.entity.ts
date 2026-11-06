import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, Check, Index } from 'typeorm';
import { NoticePriority } from '../../notices/notice-policy';
import { Organization } from './organization.entity';
import { User } from './user.entity';

@Entity('notice')
@Check('CHK_notice_priority', `"priority" IN ('NORMAL','IMPORTANT','EMERGENCY')`)
@Check('CHK_notice_schedule', `("status" = 'SCHEDULED') = ("scheduled_at" IS NOT NULL)`)
@Check('CHK_notice_attachments', 'cardinality("attachment_ids") <= 5')
@Index('IDX_notice_scheduled_due', ['scheduled_at', 'id'], { where: `"status" = 'SCHEDULED'` })
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

  @Column({ type: 'varchar', length: 16, default: NoticePriority.NORMAL })
  priority: NoticePriority;

  @Column({ type: 'timestamptz', nullable: true })
  scheduled_at: Date | null;

  @Column({ type: 'uuid', array: true, default: () => "'{}'::uuid[]" })
  attachment_ids: string[];

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
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdByUser: User;
}