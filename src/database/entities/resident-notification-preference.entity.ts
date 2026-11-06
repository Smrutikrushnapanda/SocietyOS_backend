import { Check, Column, Entity, ForeignKey, PrimaryColumn } from 'typeorm';
import { User } from './user.entity';
import { Organization } from './organization.entity';
import { NotificationCategory } from '../../notifications/notification-preferences.policy';

@Entity('resident_notification_preferences')
@Check(
  'CHK_resident_notification_preference_category',
  `"category" IN ('SECURITY', 'EMERGENCY', 'VISITOR_ARRIVAL', 'VISITOR_APPROVAL', 'NOTICE', 'COMPLAINT', 'DOCUMENT', 'POLL', 'AMENITY', 'GENERAL')`,
)
@Check(
  'CHK_resident_notification_preference_mandatory',
  `"enabled" OR "category" NOT IN ('SECURITY', 'EMERGENCY', 'VISITOR_ARRIVAL', 'VISITOR_APPROVAL')`,
)
export class ResidentNotificationPreference {
  @PrimaryColumn('uuid', {
    primaryKeyConstraintName: 'PK_resident_notification_preferences',
  })
  @ForeignKey(() => User, 'id', {
    name: 'FK_resident_notification_preference_user',
    onDelete: 'CASCADE',
  })
  user_id: string;

  @PrimaryColumn('uuid', {
    primaryKeyConstraintName: 'PK_resident_notification_preferences',
  })
  @ForeignKey(() => Organization, 'id', {
    name: 'FK_resident_notification_preference_organization',
    onDelete: 'CASCADE',
  })
  organization_id: string;

  @PrimaryColumn({
    type: 'varchar',
    length: 32,
    primaryKeyConstraintName: 'PK_resident_notification_preferences',
  })
  category: NotificationCategory;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;
}
