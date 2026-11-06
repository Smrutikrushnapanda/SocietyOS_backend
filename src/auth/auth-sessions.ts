import { UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';
import { createHash, createHmac, randomBytes, randomUUID } from 'crypto';
import { Redis } from 'ioredis';

export const ADMIN_INACTIVITY_SECONDS = 7 * 24 * 60 * 60;
export const RESIDENT_GUARD_INACTIVITY_SECONDS = 90 * 24 * 60 * 60;
export const INACTIVITY_SECONDS = ADMIN_INACTIVITY_SECONDS;

/**
 * Admin sessions expire after 7 days of inactivity; resident and guard
 * sessions stay valid for 90 days of inactivity. Callers that cannot supply a
 * portal fall back to the non-admin policy.
 */
export function inactivitySecondsFor(portal?: string): number {
  return String(portal || '').toLowerCase() === 'admin'
    ? ADMIN_INACTIVITY_SECONDS
    : RESIDENT_GUARD_INACTIVITY_SECONDS;
}

const hash = (token: string) => createHash('sha256').update(token).digest('hex');
const prefix = 'auth:session:';
export interface AuthSession { id: string; userId: string; tokenHash: string; lastActivityAt: number; expiresAt: number; inactivitySeconds?: number }

// Redis time and one script serialize refresh, activity and logout across processes.
const script = `-- societyos-session-v1
local clock=redis.call('TIME')
local now=tonumber(clock[1])*1000+math.floor(tonumber(clock[2])/1000)
local ttl=tonumber(ARGV[2])
local action=ARGV[1]
local raw=redis.call('GET',KEYS[1])
local s=raw and cjson.decode(raw) or nil
if s and s.inactivitySeconds then ttl=tonumber(s.inactivitySeconds) or ttl end
if action=='create' then
 s={id=ARGV[3],userId=ARGV[4],tokenHash=ARGV[5],lastActivityAt=now,expiresAt=now+ttl*1000,inactivitySeconds=ttl}
elseif action=='migrate' then
 local uid=redis.call('GET',KEYS[2])
 local remaining=redis.call('PTTL',KEYS[2])
 if not uid or remaining<=0 or uid~=ARGV[4] then return nil end
 redis.call('DEL',KEYS[2])
 redis.call('SREM','user:sessions:'..uid,ARGV[6])
 s={id=ARGV[3],userId=uid,tokenHash=ARGV[5],lastActivityAt=now+remaining-ttl*1000,expiresAt=now+remaining,inactivitySeconds=ttl}
else
 if not s or s.expiresAt<=now then return nil end
 if action=='logout' then
  if s.tokenHash~=ARGV[5] and redis.call('GET',KEYS[2])~=s.id then return nil end
  redis.call('DEL',KEYS[1],'refresh:'..s.tokenHash)
  redis.call('SREM','user:sessions:'..s.userId,s.id)
  return 'OK'
 end
 if s.userId~=ARGV[4] then return nil end
 if action=='rotate' then
  if s.tokenHash~=ARGV[5] then
   if s.tokenHash==ARGV[6] and redis.call('GET','auth:used:'..ARGV[5])==s.id then return cjson.encode(s) end
   return nil
  end
  redis.call('SET','auth:used:'..s.tokenHash,s.id,'PX',s.expiresAt-now)
  redis.call('DEL','refresh:'..s.tokenHash)
  s.tokenHash=ARGV[6]
 elseif action=='activity' then
  if now-s.lastActivityAt>=30000 then s.lastActivityAt=now s.expiresAt=now+ttl*1000 end
 elseif action=='check' then return cjson.encode(s)
 else return nil end
end
local remaining=math.max(1,math.floor(s.expiresAt-now))
redis.call('SET',KEYS[1],cjson.encode(s),'PX',remaining)
redis.call('SET','refresh:'..s.tokenHash,s.id,'PX',remaining)
redis.call('SADD','user:sessions:'..s.userId,s.id)
redis.call('EXPIRE','user:sessions:'..s.userId,ttl)
return cjson.encode(s)
`;

export class AuthSessions {
  constructor(private readonly redis: Redis) {}
  private async run(action: string, id: string, userId = '', tokenHash = '', nextHash = '', secondKey = 'auth:unused', ttl = INACTIVITY_SECONDS): Promise<AuthSession> {
    let result: unknown;
    try { result = await this.redis.eval(script, 2, prefix + id, secondKey, action, ttl, id, userId, tokenHash, nextHash); }
    catch { throw new ServiceUnavailableException('Session verification unavailable. Retry when connected.'); }
    if (typeof result !== 'string') throw new UnauthorizedException('Session expired or revoked');
    return action === 'logout' ? {} as AuthSession : JSON.parse(result) as AuthSession;
  }
  async create(userId: string, ttl: number = INACTIVITY_SECONDS) {
    const id = randomUUID();
    const token = `${id}.${randomBytes(32).toString('hex')}`;
    const session = await this.run('create', id, userId, hash(token), '', 'auth:unused', ttl);
    return { token, session };
  }
  async lookup(token: string): Promise<{ id: string; userId: string; legacy: boolean }> {
    if (typeof token !== 'string' || !/^(?:[a-f0-9-]{36}\.)?[a-f0-9]{64}$/.test(token)) throw new UnauthorizedException('Invalid refresh token');
    const value = await this.redis.get(`refresh:${hash(token)}`) || (token.includes('.') ? await this.redis.get(`auth:used:${hash(token)}`) : null);
    if (!value) throw new UnauthorizedException('Invalid refresh token');
    const id = token.includes('.') ? token.split('.')[0] : randomUUID();
    if (!token.includes('.')) return { id, userId: value, legacy: true };
    const raw = await this.redis.get(prefix + id);
    if (!raw) throw new UnauthorizedException('Session expired or revoked');
    const session = JSON.parse(raw) as AuthSession;
    if (value !== id) throw new UnauthorizedException('Invalid refresh token');
    return { id, userId: session.userId, legacy: false };
  }
  async rotate(token: string, identity: { id: string; userId: string; legacy: boolean }, rotationId: string = randomUUID(), ttl: number = INACTIVITY_SECONDS) {
    const key = process.env.JWT_ACCESS_TOKEN_SECRET;
    if (!key) throw new ServiceUnavailableException('Session signing unavailable');
    const next = `${identity.id}.${createHmac('sha256', key).update(`${token}:${rotationId}`).digest('hex')}`;
    const session = identity.legacy
      ? await this.run('migrate', identity.id, identity.userId, hash(next), hash(token), `refresh:${hash(token)}`, ttl)
      : await this.run('rotate', identity.id, identity.userId, hash(token), hash(next), 'auth:unused', ttl);
    return { token: next, session };
  }
  check(id: string, userId: string) { return this.run('check', id, userId); }
  activity(id: string, userId: string, ttl: number = INACTIVITY_SECONDS) { return this.run('activity', id, userId, '', '', 'auth:unused', ttl); }
  async logout(token: string): Promise<void> {
    if (!token) return;
    if (!token.includes('.')) {
      const tokenHash = hash(token);
      const userId = await this.redis.get(`refresh:${tokenHash}`);
      await this.redis.del(`refresh:${tokenHash}`);
      if (userId) await this.redis.srem(`user:sessions:${userId}`, tokenHash);
      return;
    }
    try { await this.run('logout', token.split('.')[0], '', hash(token), '', `auth:used:${hash(token)}`); }
    catch (error) { if (!(error instanceof UnauthorizedException)) throw error; }
  }
  async revokeAll(userId: string): Promise<void> {
    const keys = await this.redis.smembers(`user:sessions:${userId}`);
    for (const id of keys) {
      const raw = await this.redis.get(prefix + id);
      if (raw) await this.redis.del(`refresh:${(JSON.parse(raw) as AuthSession).tokenHash}`);
      await this.redis.del(prefix + id, `refresh:${id}`);
    }
    await this.redis.del(`user:sessions:${userId}`);
  }
}
