import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  INotificationProvider,
  NotificationPayload,
  SendResult,
} from '../interfaces/INotificationProvider.interface';
// firebase-admin v14 uses the modular API — no compat default export
import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import {
  fcmDispatchGuard,
  FcmDispatchBlockedError,
} from '../fcm-dispatch.guard';
import {
  classifyProviderError,
  DeliveryError,
  type TokenDeliveryResult,
} from '../delivery/delivery.policy';

@Injectable()
export class FirebaseNotificationProvider
  implements INotificationProvider, OnModuleInit
{
  private readonly logger = new Logger(FirebaseNotificationProvider.name);
  private messaging: ReturnType<typeof getMessaging> | null = null;

  onModuleInit() {
    if (!fcmDispatchGuard.isEnabled()) return;
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
    } catch {
      this.logger.error(
        'Firebase Admin initialization failed; configuration unavailable',
      );
    }
  }

  assertDispatchAllowed(): void {
    fcmDispatchGuard.assertAllowed();
  }

  async sendToTokens(
    tokens: string[],
    payload: NotificationPayload,
  ): Promise<SendResult> {
    this.assertDispatchAllowed();
    const messaging = this.messaging;
    if (!messaging || tokens.length === 0) {
      return {
        successCount: 0,
        failureCount: tokens.length,
        invalidTokens: [],
        tokenResults: tokens.map(() => ({
          status: 'retryable',
          error: DeliveryError.CONFIGURATION,
        })),
      };
    }

    const message = {
      tokens,
      ...(payload.dataOnly
        ? {}
        : { notification: { title: payload.title, body: payload.body } }),
      data: payload.data ?? {},
      ...(!payload.dataOnly && payload.data?.category === 'POLL' ? {
        android: { priority: 'high' as const, notification: { channelId: 'society-polls', icon: 'ic_notification', color: '#205c4a' } },
      } : {}),
    };

    try {
      const response = await fcmDispatchGuard.run(() =>
        messaging.sendEachForMulticast(message),
      );
      const invalidTokens: string[] = [];

      const tokenResults: TokenDeliveryResult[] = response.responses.map(
        (result, index) => {
          if (result.success) return { status: 'accepted', error: null };
          const outcome = classifyProviderError(result.error);
          if (outcome.error === DeliveryError.INVALID_TOKEN)
            invalidTokens.push(tokens[index]);
          return outcome;
        },
      );

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokens,
        tokenResults,
      };
    } catch (error: unknown) {
      if (error instanceof FcmDispatchBlockedError) throw error;
      const outcome = classifyProviderError(error);
      this.logger.error('FCM request failed', {
        classification: outcome.error,
      });
      return {
        successCount: 0,
        failureCount: tokens.length,
        invalidTokens: [],
        tokenResults: tokens.map(() => outcome),
      };
    }
  }
}
