import { Entity, PrimaryColumn, Column, Index, Unique } from 'typeorm';

export enum PushTokenPlatform {
  WEB = 'WEB',
  ANDROID = 'ANDROID',
  IOS = 'IOS',
}

@Entity('push_tokens')
@Unique(['user_id', 'token'])
export class PushToken {
  @PrimaryColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  user_id: string;

  @Index()
  @Column({ type: 'uuid' })
  organization_id: string;

  @Column('text')
  token: string;

  @Column({
    type: 'enum',
    enum: PushTokenPlatform,
    default: PushTokenPlatform.WEB,
  })
  platform: PushTokenPlatform;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'timestamp', nullable: true })
  last_seen_at: Date | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
