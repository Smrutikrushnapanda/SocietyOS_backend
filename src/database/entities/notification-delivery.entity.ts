import {
  Check,
  Column,
  Entity,
  ForeignKey,
  Index,
  PrimaryColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Organization } from './organization.entity';
import { NotificationCategory } from '../../notifications/notification-preferences.policy';
import {
  DeliveryError,
  DeliveryState,
} from '../../notifications/delivery/delivery.policy';

@Entity('notification_deliveries')
@Check('CHK_notification_delivery_channel', `"channel" IN ('PUSH','WHATSAPP')`)
@Index('IDX_notification_delivery_channel_due', ['channel', 'state', 'next_attempt_at'])
@Index(
  'UQ_notification_delivery_event',
  ['organization_id', 'recipient_user_id', 'idempotency_key'],
  { unique: true },
)
@Index(
  'IDX_notification_delivery_due',
  ['state', 'next_attempt_at', 'created_at'],
  { where: `"state" IN ('PENDING', 'RETRY_WAIT')` },
)
@Index('IDX_notification_delivery_lease', ['lease_until'], {
  where: `"state" = 'PROCESSING'`,
})
@Check('CHK_notification_delivery_attempt', '"attempt_count" BETWEEN 0 AND 5')
@Check(
  'CHK_notification_delivery_state',
  `"state" IN ('PENDING','PROCESSING','RETRY_WAIT','ACCEPTED_BY_PROVIDER','PERMANENT_FAILURE','CANCELLED')`,
)
@Check(
  'CHK_notification_delivery_lease',
  `(("state" = 'PROCESSING' AND "lease_id" IS NOT NULL AND "lease_until" IS NOT NULL) OR ("state" <> 'PROCESSING' AND "lease_id" IS NULL AND "lease_until" IS NULL))`,
)
@Check(
  'CHK_notification_delivery_completed',
  `("state" IN ('ACCEPTED_BY_PROVIDER','PERMANENT_FAILURE','CANCELLED')) = ("completed_at" IS NOT NULL)`,
)
@Check(
  'CHK_notification_delivery_category',
  `"category" IN ('SECURITY','EMERGENCY','VISITOR_ARRIVAL','VISITOR_APPROVAL','NOTICE','COMPLAINT','DOCUMENT','POLL','AMENITY','GENERAL')`,
)
export class NotificationDelivery {
  @PrimaryColumn('uuid', {
    primaryKeyConstraintName: 'PK_notification_deliveries',
  })
  id: string;
  @Column('uuid')
  @ForeignKey(() => Organization, 'id', {
    name: 'FK_notification_delivery_organization',
    onDelete: 'CASCADE',
  })
  organization_id: string;
  @Column('uuid')
  @ForeignKey(() => User, 'id', {
    name: 'FK_notification_delivery_user',
    onDelete: 'CASCADE',
  })
  recipient_user_id: string;
  @Column('uuid') reference_id: string;
  @Column('uuid') idempotency_key: string;
  @Column({ type: 'varchar', length: 32 }) category: NotificationCategory;
  @Column({ type: 'varchar', length: 16, default: 'PUSH' }) channel: 'PUSH' | 'WHATSAPP';
  @Column({ type: 'varchar', length: 32, default: DeliveryState.PENDING })
  state: DeliveryState;
  @Column({ type: 'integer', default: 0 }) attempt_count: number;
  @Column({ type: 'uuid', nullable: true }) lease_id: string | null;
  @Column({ type: 'timestamptz', nullable: true }) lease_until: Date | null;
  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  next_attempt_at: Date;
  @Column({ type: 'uuid', array: true, nullable: true }) target_token_ids:
    string[] | null;
  @Column({ type: 'uuid', array: true, default: () => "'{}'::uuid[]" })
  accepted_token_ids: string[];
  @Column({ type: 'uuid', array: true, default: () => "'{}'::uuid[]" })
  permanent_token_ids: string[];
  @Column({ type: 'varchar', length: 32, nullable: true })
  error_code: DeliveryError | null;
  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;
  @Column({ type: 'timestamptz', nullable: true }) completed_at: Date | null;
}
