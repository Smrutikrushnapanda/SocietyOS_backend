import { Logger } from '@nestjs/common';
import { EventEmitter } from 'events';

const logger = new Logger('ResilientRedis');

export class InMemoryRedis extends EventEmitter {
  private store = new Map<string, { value: string; expiresAt?: number }>();
  private sets = new Map<string, Set<string>>();

  private clean(key: string) {
    const item = this.store.get(key);
    if (item && item.expiresAt && item.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return item;
  }

  async get(key: string): Promise<string | null> {
    const item = this.clean(key);
    return item ? item.value : null;
  }

  async set(key: string, value: string, ...args: any[]): Promise<'OK'> {
    let ttlSeconds: number | undefined;
    for (let i = 0; i < args.length; i++) {
      const arg = String(args[i]).toUpperCase();
      if (arg === 'EX' && args[i + 1]) {
        ttlSeconds = Number(args[i + 1]);
      } else if (arg === 'PX' && args[i + 1]) {
        ttlSeconds = Number(args[i + 1]) / 1000;
      }
    }
    this.store.set(key, {
      value: String(value),
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    });
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const k of keys) {
      if (this.store.delete(k)) count++;
      if (this.sets.delete(k)) count++;
    }
    return count;
  }

  async exists(key: string): Promise<number> {
    return this.clean(key) ? 1 : 0;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const item = this.clean(key);
    if (!item) return 0;
    item.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  async pexpire(key: string, ms: number): Promise<number> {
    const item = this.clean(key);
    if (!item) return 0;
    item.expiresAt = Date.now() + ms;
    return 1;
  }

  async ttl(key: string): Promise<number> {
    const item = this.clean(key);
    if (!item || !item.expiresAt) return -1;
    return Math.max(0, Math.ceil((item.expiresAt - Date.now()) / 1000));
  }

  async pttl(key: string): Promise<number> {
    const item = this.clean(key);
    if (!item || !item.expiresAt) return -1;
    return Math.max(0, item.expiresAt - Date.now());
  }

  async incr(key: string): Promise<number> {
    const item = this.clean(key);
    const val = item ? parseInt(item.value, 10) || 0 : 0;
    const next = val + 1;
    this.store.set(key, { value: String(next), expiresAt: item?.expiresAt });
    return next;
  }

  async sadd(key: string, ...values: string[]): Promise<number> {
    if (!this.sets.has(key)) this.sets.set(key, new Set());
    const set = this.sets.get(key)!;
    let added = 0;
    for (const v of values) {
      if (!set.has(v)) {
        set.add(v);
        added++;
      }
    }
    return added;
  }

  async srem(key: string, ...values: string[]): Promise<number> {
    const set = this.sets.get(key);
    if (!set) return 0;
    let removed = 0;
    for (const v of values) {
      if (set.delete(v)) removed++;
    }
    return removed;
  }

  async smembers(key: string): Promise<string[]> {
    const set = this.sets.get(key);
    return set ? Array.from(set) : [];
  }

  async ping(): Promise<'PONG'> {
    return 'PONG';
  }

  async eval(
    _script: string,
    _count: number,
    key: string,
    second: string,
    action: string,
    ttl: number,
    id: string,
    userId: string,
    tokenHash: string,
    nextHash: string,
  ): Promise<any> {
    const now = Date.now();
    const raw = await this.get(key);
    let session = raw ? JSON.parse(raw) : null;
    if (session?.inactivitySeconds) ttl = session.inactivitySeconds;

    if (action === 'create') {
      session = {
        id,
        userId,
        tokenHash,
        lastActivityAt: now,
        expiresAt: now + ttl * 1000,
        inactivitySeconds: ttl,
      };
    } else if (action === 'migrate') {
      const previous = await this.get(second);
      const remaining = (await this.ttl(second)) * 1000;
      if (previous !== userId || remaining <= 0) return null;
      await this.del(second);
      await this.srem(`user:sessions:${userId}`, nextHash);
      session = {
        id,
        userId,
        tokenHash,
        lastActivityAt: now + remaining - ttl * 1000,
        expiresAt: now + remaining,
        inactivitySeconds: ttl,
      };
    } else {
      if (!session || session.expiresAt <= now) return null;
      if (action === 'logout') {
        if (session.tokenHash !== tokenHash && (await this.get(second)) !== id) {
          return null;
        }
        await this.del(key, `refresh:${session.tokenHash}`);
        await this.srem(`user:sessions:${session.userId}`, id);
        return 'OK';
      }
      if (session.userId !== userId) return null;
      if (action === 'rotate') {
        if (session.tokenHash !== tokenHash) {
          return session.tokenHash === nextHash &&
            (await this.get(`auth:used:${tokenHash}`)) === id
            ? JSON.stringify(session)
            : null;
        }
        await this.set(
          `auth:used:${tokenHash}`,
          id,
          'EX',
          Math.ceil((session.expiresAt - now) / 1000),
        );
        await this.del(`refresh:${tokenHash}`);
        session.tokenHash = nextHash;
      } else if (action === 'activity') {
        if (now - session.lastActivityAt >= 30000) {
          session.lastActivityAt = now;
          session.expiresAt = now + ttl * 1000;
        }
      } else if (action === 'check') {
        return JSON.stringify(session);
      }
    }

    const remainingSec = Math.max(1, Math.ceil((session.expiresAt - now) / 1000));
    await this.set(key, JSON.stringify(session), 'EX', remainingSec);
    await this.set(`refresh:${session.tokenHash}`, id, 'EX', remainingSec);
    await this.sadd(`user:sessions:${session.userId}`, id);
    return JSON.stringify(session);
  }
}

export function createResilientRedisClient(redisUrl?: string): any {
  const fallback = new InMemoryRedis();

  if (!redisUrl || redisUrl.includes('localhost:6379')) {
    logger.log('Using in-memory Redis client (no remote REDIS_URL configured).');
    return fallback;
  }

  try {
    const IORedis = require('ioredis');
    const client = new IORedis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      enableOfflineQueue: false,
      retryStrategy(times: number) {
        if (times > 3) return null;
        return Math.min(times * 200, 1000);
      },
    });

    let isConnected = false;

    client.on('connect', () => {
      isConnected = true;
      logger.log('Redis connected successfully.');
    });

    client.on('error', (err: any) => {
      isConnected = false;
      logger.warn(`Redis connection error (${err?.message}); falling back to memory store.`);
    });

    return new Proxy(client, {
      get(target, prop, receiver) {
        const orig = target[prop];
        if (typeof orig === 'function') {
          return async (...args: any[]) => {
            if (!isConnected) {
              const fallbackFn = (fallback as any)[prop];
              if (typeof fallbackFn === 'function') {
                return fallbackFn.apply(fallback, args);
              }
            }
            try {
              return await orig.apply(target, args);
            } catch (err: any) {
              logger.warn(`Redis command '${String(prop)}' failed (${err?.message}), using in-memory store.`);
              const fallbackFn = (fallback as any)[prop];
              if (typeof fallbackFn === 'function') {
                return fallbackFn.apply(fallback, args);
              }
              throw err;
            }
          };
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  } catch (err: any) {
    logger.warn(`Failed to initialize ioredis (${err?.message}), using in-memory store.`);
    return fallback;
  }
}
