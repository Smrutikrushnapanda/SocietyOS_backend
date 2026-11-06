export enum NotificationCategory {
  SECURITY = 'SECURITY',
  EMERGENCY = 'EMERGENCY',
  VISITOR_ARRIVAL = 'VISITOR_ARRIVAL',
  VISITOR_APPROVAL = 'VISITOR_APPROVAL',
  NOTICE = 'NOTICE',
  COMPLAINT = 'COMPLAINT',
  DOCUMENT = 'DOCUMENT',
  POLL = 'POLL',
  AMENITY = 'AMENITY',
  GENERAL = 'GENERAL',
}

export const MANDATORY_NOTIFICATION_CATEGORIES = new Set<NotificationCategory>([
  NotificationCategory.SECURITY,
  NotificationCategory.EMERGENCY,
  NotificationCategory.VISITOR_ARRIVAL,
  NotificationCategory.VISITOR_APPROVAL,
]);

export function isNotificationCategory(
  value: string,
): value is NotificationCategory {
  return Object.values<string>(NotificationCategory).includes(value);
}

export interface EffectiveNotificationPreference {
  category: NotificationCategory;
  enabled: boolean;
  mandatory: boolean;
}
