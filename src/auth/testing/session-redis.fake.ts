// AuthService unit double; real Lua behavior is covered with isolated Redis tests.
export function attachSessionRedisFake(redis: any) {
  const sets = new Map<string, Set<string>>();
  redis.sadd ||= async (key: string, value: string) => { if (!sets.has(key)) sets.set(key, new Set()); sets.get(key)!.add(value); };
  redis.srem ||= async (key: string, value: string) => sets.get(key)?.delete(value);
  redis.smembers ||= async (key: string) => [...sets.get(key) || []];
  let queue = Promise.resolve();
  const put = async (key: string, value: string, ttl: number) => { await redis.set(key, value); await redis.expire(key, ttl); };
  redis.eval = (_script: string, _count: number, key: string, second: string, action: string, ttl: number, id: string, userId: string, tokenHash: string, nextHash: string) => {
    const work = async () => {
      const now = Date.now();
      const raw = await redis.get(key);
      let session = raw ? JSON.parse(raw) : null;
      if (session?.inactivitySeconds) ttl = session.inactivitySeconds;
      if (action === 'create') session = { id, userId, tokenHash, lastActivityAt: now, expiresAt: now + ttl * 1000, inactivitySeconds: ttl };
      else if (action === 'migrate') {
        const previous = await redis.get(second); const remaining = await redis.ttl(second) * 1000;
        if (previous !== userId || remaining <= 0) return null;
        await redis.del(second); await redis.srem(`user:sessions:${userId}`, nextHash);
        session = { id, userId, tokenHash, lastActivityAt: now + remaining - ttl * 1000, expiresAt: now + remaining, inactivitySeconds: ttl };
      } else {
        if (!session || session.expiresAt <= now) return null;
        if (action === 'logout') {
          if (session.tokenHash !== tokenHash && await redis.get(second) !== id) return null;
          await redis.del(key, `refresh:${session.tokenHash}`); await redis.srem(`user:sessions:${session.userId}`, id); return 'OK';
        }
        if (session.userId !== userId) return null;
        if (action === 'rotate') {
          if (session.tokenHash !== tokenHash) return session.tokenHash === nextHash && await redis.get(`auth:used:${tokenHash}`) === id ? JSON.stringify(session) : null;
          await put(`auth:used:${tokenHash}`, id, (session.expiresAt - now) / 1000);
          await redis.del(`refresh:${tokenHash}`); session.tokenHash = nextHash;
        } else if (action === 'activity' && now - session.lastActivityAt >= 30000) { session.lastActivityAt = now; session.expiresAt = now + ttl * 1000; }
        else if (action === 'check') return JSON.stringify(session);
      }
      const remaining = (session.expiresAt - now) / 1000;
      await put(key, JSON.stringify(session), remaining); await put(`refresh:${session.tokenHash}`, id, remaining);
      await redis.sadd(`user:sessions:${session.userId}`, id);
      return JSON.stringify(session);
    };
    const result = queue.then(work); queue = result.then(() => undefined, () => undefined); return result;
  };
  return redis;
}
