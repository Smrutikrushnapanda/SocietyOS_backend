import { Entity, PrimaryColumn, Column, Index } from 'typeorm';

@Entity('notifications')
@Index(['organization_id', 'recipient_user_id'])
export class Notification {
  @PrimaryColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  organization_id: string;

  @Index()
  @Column({ type: 'uuid' })
  recipient_user_id: string;

  @Column({ length: 50 })
  type: string;

  @Column({ length: 255 })
  title: string;

  @Column('text')
  body: string;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any> | null;

  @Index()
  @Column({ type: 'boolean', default: false })
  is_read: boolean;

  @Column({ type: 'timestamp', nullable: true })
  read_at: Date | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
