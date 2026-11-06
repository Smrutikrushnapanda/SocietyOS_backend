import { Logger } from '@nestjs/common';

export class FcmDispatchBlockedError extends Error {
  constructor() {
    super('FCM dispatch disabled');
    this.name = 'FcmDispatchBlockedError';
  }
}

class FcmDispatchGuard {
  private readonly logger = new Logger(FcmDispatchGuard.name);
  private lastBlockedReason: string | null = null;

  isEnabled(): boolean {
    return process.env.FCM_DISPATCH_ENABLED === 'true';
  }

  assertAllowed(): void {
    const value = process.env.FCM_DISPATCH_ENABLED;
    if (value === 'true') {
      this.lastBlockedReason = null;
      return;
    }
    const reason =
      value === undefined
        ? 'configuration_missing'
        : value === 'false'
          ? 'disabled'
          : 'configuration_invalid';
    if (reason !== this.lastBlockedReason) {
      this.lastBlockedReason = reason;
      try {
        this.logger.warn({ event: 'fcm_dispatch_blocked', reason });
      } catch {
        // Logging failures must retain the typed pause signal and keep transport blocked.
      }
    }
    throw new FcmDispatchBlockedError();
  }

  run<T>(send: () => Promise<T>): Promise<T> {
    this.assertAllowed();
    return send();
  }
}

export const fcmDispatchGuard = new FcmDispatchGuard();
