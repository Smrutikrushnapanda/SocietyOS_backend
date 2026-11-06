export enum DeliveryState {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  RETRY_WAIT = 'RETRY_WAIT',
  ACCEPTED_BY_PROVIDER = 'ACCEPTED_BY_PROVIDER',
  PERMANENT_FAILURE = 'PERMANENT_FAILURE',
  CANCELLED = 'CANCELLED',
}
export enum DeliveryError {
  OPTED_OUT = 'OPTED_OUT',
  RECIPIENT_INELIGIBLE = 'RECIPIENT_INELIGIBLE',
  PREFERENCE_UNAVAILABLE = 'PREFERENCE_UNAVAILABLE',
  STORAGE_UNAVAILABLE = 'STORAGE_UNAVAILABLE',
  NO_ACTIVE_TOKEN = 'NO_ACTIVE_TOKEN',
  TOKEN_REVOKED = 'TOKEN_REVOKED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  RATE_LIMITED = 'RATE_LIMITED',
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
  CONFIGURATION = 'CONFIGURATION',
  INVALID_PAYLOAD = 'INVALID_PAYLOAD',
  UNKNOWN_OUTCOME = 'UNKNOWN_OUTCOME',
  LEASE_EXPIRED = 'LEASE_EXPIRED',
  TARGET_FAILED = 'TARGET_FAILED',
  DISPATCH_DISABLED = 'DISPATCH_DISABLED',
}
export interface TokenDeliveryResult {
  status: 'accepted' | 'retryable' | 'permanent' | 'uncertain';
  error: DeliveryError | null;
}
export const DELIVERY_MAX_ATTEMPTS = 5;
export const DELIVERY_LEASE_MS = 120000;
export const DELIVERY_TIMEOUT_MS = 10000;
export const DELIVERY_UNCERTAIN_DELAY_MS = 600000;

export function retryDelay(
  attempt: number,
  random: () => number = Math.random,
  uncertain = false,
): number {
  const base = Math.min(
    60000 * 2 ** Math.max(0, Math.min(attempt - 1, 10)),
    3600000,
  );
  const sample = random();
  const jitter = Number.isFinite(sample)
    ? Math.min(1, Math.max(0, sample))
    : 0.5;
  return Math.max(
    uncertain ? DELIVERY_UNCERTAIN_DELAY_MS : 1000,
    Math.floor(base * (0.5 + jitter)),
  );
}

export function classifyProviderError(error: unknown): TokenDeliveryResult {
  const code =
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
      ? error.code
      : '';
  switch (code) {
    case 'messaging/registration-token-not-registered':
    case 'messaging/invalid-registration-token':
      return { status: 'permanent', error: DeliveryError.INVALID_TOKEN };
    case 'messaging/invalid-argument':
    case 'messaging/invalid-payload':
    case 'messaging/payload-size-limit-exceeded':
      return { status: 'permanent', error: DeliveryError.INVALID_PAYLOAD };
    case 'messaging/quota-exceeded':
    case 'messaging/message-rate-exceeded':
    case 'messaging/device-message-rate-exceeded':
      return { status: 'retryable', error: DeliveryError.RATE_LIMITED };
    case 'messaging/server-unavailable':
    case 'messaging/internal-error':
      return { status: 'retryable', error: DeliveryError.PROVIDER_UNAVAILABLE };
    case 'messaging/mismatched-credential':
    case 'messaging/authentication-error':
    case 'messaging/third-party-auth-error':
      return { status: 'retryable', error: DeliveryError.CONFIGURATION };
    default:
      return { status: 'uncertain', error: DeliveryError.UNKNOWN_OUTCOME };
  }
}
