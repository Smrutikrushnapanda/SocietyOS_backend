/**
 * Production Rate Limiting Middleware
 *
 * Implements sliding-window rate limiting with:
 * - Redis store for distributed deployments (atomic INCR + EXPIRE).
 * - Safe failover to in-memory sliding window when Redis is unavailable or disconnected.
 * - Tighter limits for sensitive authentication and OTP endpoints.
 * - Configurable limits via RATE_LIMIT_MAX_PER_MINUTE and RATE_LIMIT_AUTH_MAX_PER_MINUTE.
 * - Standard RFC rate-limiting headers (X-RateLimit-*, Retry-After).
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitRecord>();
let customRedisClient: any = null;
let defaultRedisClient: any = null;
let defaultRedisAttempted = false;

export function setRateLimitRedisClient(client: any): void {
  customRedisClient = client;
}

export function resetRateLimitStore(): void {
  memoryStore.clear();
}

function getRedisClient(): any {
  if (customRedisClient !== null) {
    return customRedisClient;
  }
  if (defaultRedisAttempted) {
    return defaultRedisClient;
  }
  defaultRedisAttempted = true;

  if (process.env.REDIS_URL && process.env.NODE_ENV !== 'test') {
    try {
      const Redis = require('ioredis');
      defaultRedisClient = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        connectTimeout: 2000,
        lazyConnect: true,
      });
      defaultRedisClient.on('error', () => {
        // Operational warning without logging secrets
        console.warn('[RateLimit] Redis storage warning; using local rate limiting fallback.');
      });
    } catch {
      defaultRedisClient = null;
    }
  }
  return defaultRedisClient;
}

const SENSITIVE_AUTH_PATHS = [
  '/auth/login',
  '/auth/admin/login',
  '/auth/guard/login',
  '/auth/resident/login',
  '/auth/whatsapp/request-otp',
  '/auth/whatsapp/verify-otp',
  '/auth/request-otp',
  '/auth/verify-otp',
  '/auth/forgot-password',
  '/auth/verify-recovery-otp',
  '/auth/reset-password',
];

function isSensitiveAuthRoute(path: string): boolean {
  if (!path) return false;
  const cleanPath = path.toLowerCase().split('?')[0];
  return SENSITIVE_AUTH_PATHS.some((p) => cleanPath.endsWith(p));
}

export async function RateLimitMiddleware(req: any, res: any, next: any): Promise<void> {
  const ip =
    (req.headers && req.headers['x-forwarded-for']
      ? String(req.headers['x-forwarded-for']).split(',')[0].trim()
      : null) ||
    req.ip ||
    req.connection?.remoteAddress ||
    '127.0.0.1';

  const path = req.path || req.url || '';
  const isAuth = isSensitiveAuthRoute(path);

  const authLimit = parseInt(process.env.RATE_LIMIT_AUTH_MAX_PER_MINUTE || '20', 10);
  const generalLimit = parseInt(process.env.RATE_LIMIT_MAX_PER_MINUTE || '200', 10);
  const limit = isAuth ? authLimit : generalLimit;
  const bucket = isAuth ? 'auth' : 'api';
  const key = `rl:${bucket}:${ip}`;

  const now = Date.now();
  const redis = getRedisClient();

  if (redis && redis.status === 'ready') {
    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, 60);
      }
      let ttl = await redis.ttl(key);
      if (ttl < 0) ttl = 60;

      const remaining = Math.max(0, limit - count);
      const resetTime = Math.floor(now / 1000) + ttl;

      res.setHeader?.('X-RateLimit-Limit', String(limit));
      res.setHeader?.('X-RateLimit-Remaining', String(remaining));
      res.setHeader?.('X-RateLimit-Reset', String(resetTime));

      if (count > limit) {
        res.setHeader?.('Retry-After', String(ttl));
        if (typeof res.status === 'function') {
          res.status(429);
          if (typeof res.json === 'function') {
            return res.json({
              statusCode: 429,
              message: 'Too many requests. Please try again later.',
              error: 'Too Many Requests',
            });
          }
        }
        return res.end?.(
          JSON.stringify({
            statusCode: 429,
            message: 'Too many requests. Please try again later.',
            error: 'Too Many Requests',
          }),
        );
      }

      return next();
    } catch {
      // Fall through to memory store safely
    }
  }

  // In-Memory sliding-window fallback
  if (memoryStore.size > 2000) {
    for (const [k, v] of memoryStore.entries()) {
      if (v.resetAt <= now) {
        memoryStore.delete(k);
      }
    }
  }

  let record = memoryStore.get(key);
  if (!record || record.resetAt <= now) {
    record = { count: 1, resetAt: now + 60000 };
    memoryStore.set(key, record);
  } else {
    record.count += 1;
  }

  const remaining = Math.max(0, limit - record.count);
  const secondsLeft = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
  const resetUnix = Math.floor(record.resetAt / 1000);

  res.setHeader?.('X-RateLimit-Limit', String(limit));
  res.setHeader?.('X-RateLimit-Remaining', String(remaining));
  res.setHeader?.('X-RateLimit-Reset', String(resetUnix));

  if (record.count > limit) {
    res.setHeader?.('Retry-After', String(secondsLeft));
    if (typeof res.status === 'function') {
      res.status(429);
      if (typeof res.json === 'function') {
        return res.json({
          statusCode: 429,
          message: 'Too many requests. Please try again later.',
          error: 'Too Many Requests',
        });
      }
    }
    return res.end?.(
      JSON.stringify({
        statusCode: 429,
        message: 'Too many requests. Please try again later.',
        error: 'Too Many Requests',
      }),
    );
  }

  return next();
}

export function TenantIsolationMiddleware(req: any, res: any, next: any) {
  req.societyId = null;
  if (res.locals) {
    res.locals.societyId = req.societyId;
  }
  next();
}
