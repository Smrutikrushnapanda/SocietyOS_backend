import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  INotificationProvider,
  NotificationPayload,
  SendResult,
} from '../interfaces/INotificationProvider.interface';
// firebase-admin v14 uses the modular API — no compat default export
import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

@Injectable()
export class FirebaseNotificationProvider
  implements INotificationProvider, OnModuleInit
{
  private readonly logger = new Logger(FirebaseNotificationProvider.name);
  private messaging: ReturnType<typeof getMessaging> | null = null;

  onModuleInit() {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
    const rawKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !rawKey) {
      this.logger.warn(
        'Firebase Admin credentials not fully configured — FCM delivery disabled.',
      );
      return;
    }

    try {
      // Normalize escaped newlines that may come from .env files
      const privateKey = rawKey.replace(/\\n/g, '\n');

      const app =
        getApps().length > 0
          ? getApp()
          : initializeApp({
              credential: cert({ projectId, clientEmail, privateKey }),
            });

      this.messaging = getMessaging(app);
      this.logger.log('Firebase Admin initialized (v14 modular API).');
    } catch (err) {
      this.logger.error(
        'Firebase Admin initialization failed:',
        (err as Error).message,
      );
    }
  }

  async sendToTokens(
    tokens: string[],
    payload: NotificationPayload,
  ): Promise<SendResult> {
    if (!this.messaging || tokens.length === 0) {
      return { successCount: 0, failureCount: tokens.length, invalidTokens: [] };
    }

    const message = {
      tokens,
      notification: { title: payload.title, body: payload.body },
      data: payload.data ?? {},
    };

    try {
      const response = await this.messaging.sendEachForMulticast(message);
      const invalidTokens: string[] = [];

      response.responses.forEach((r: any, idx: number) => {
        if (!r.success) {
          const code = r.error?.code ?? '';
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token'
          ) {
            invalidTokens.push(tokens[idx]);
          }
        }
      });

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokens,
      };
    } catch (err) {
      this.logger.error('FCM send failed', (err as Error).message);
      return { successCount: 0, failureCount: tokens.length, invalidTokens: [] };
    }
  }
}
