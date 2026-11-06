import type { TokenDeliveryResult } from '../delivery/delivery.policy';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  dataOnly?: boolean;
}

export interface SendResult {
  successCount: number;
  failureCount: number;
  invalidTokens: string[];
  tokenResults?: TokenDeliveryResult[];
}

export interface INotificationProvider {
  assertDispatchAllowed?(): void;
  sendToTokens(
    tokens: string[],
    payload: NotificationPayload,
  ): Promise<SendResult>;
}

export const NOTIFICATION_PROVIDER = 'NOTIFICATION_PROVIDER';
