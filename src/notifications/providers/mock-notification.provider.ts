import { Injectable, Logger } from '@nestjs/common';
import {
  INotificationProvider,
  NotificationPayload,
  SendResult,
} from '../interfaces/INotificationProvider.interface';

@Injectable()
export class MockNotificationProvider implements INotificationProvider {
  private readonly logger = new Logger(MockNotificationProvider.name);

  readonly sentMessages: Array<{ tokens: string[]; payload: NotificationPayload }> = [];

  async sendToTokens(
    tokens: string[],
    payload: NotificationPayload,
  ): Promise<SendResult> {
    this.sentMessages.push({ tokens, payload });
    this.logger.log(
      `[MOCK] Would send "${payload.title}" to ${tokens.length} token(s)`,
    );
    return { successCount: tokens.length, failureCount: 0, invalidTokens: [] };
  }
}
