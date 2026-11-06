import { ForbiddenException } from '@nestjs/common';
import type { Response } from 'express';

export function sessionPortal(req: any): string {
  const hint = String(req?.headers?.['x-portal-role'] || 'RESIDENT').toUpperCase();
  return ['ADMIN', 'SOCIETY_ADMIN', 'SUPER_ADMIN'].includes(hint) ? 'admin' : hint === 'GUARD' ? 'guard' : 'resident';
}
const cookieName = (req: any) => `societyos_refresh_${sessionPortal(req)}`;
function cookieOptions() {
  const secure = process.env.NODE_ENV === 'production' || process.env.AUTH_COOKIE_SECURE === 'true';
  const sameSite = process.env.AUTH_COOKIE_SAMESITE === 'none' ? 'none' as const : 'lax' as const;
  if (sameSite === 'none' && !secure) throw new ForbiddenException('Cross-site sessions require HTTPS');
  return { httpOnly: true, secure, sameSite, path: '/api/v1/auth' };
}
export function assertSessionOrigin(req: any): void {
  if (req?.headers?.['x-session-mode'] !== 'cookie') return;
  const origin = req.headers.origin;
  const allowed = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://127.0.0.1:3001', ...(process.env.CORS_ORIGIN || '').split(',').map(value => value.trim())];
  if (typeof origin !== 'string' || !allowed.includes(origin)) throw new ForbiddenException('Session origin denied');
}
export function sessionCredential(req: any, bodyToken?: string): string {
  if (req?.headers?.['x-session-mode'] !== 'cookie') return bodyToken || '';
  assertSessionOrigin(req);
  const key = cookieName(req);
  const value = String(req.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith(key + '='));
  // Body permits one-time migration of an existing tab's legacy credential.
  return value ? decodeURIComponent(value.slice(key.length + 1)) : bodyToken || '';
}
export function writeSessionCookie(req: any, res: Response | undefined, token: string, expiresAt: number) {
  if (req?.headers?.['x-session-mode'] !== 'cookie' || !res) return;
  assertSessionOrigin(req);
  res.cookie(cookieName(req), token, { ...cookieOptions(), maxAge: Math.max(0, expiresAt - Date.now()) });
}
export function clearSessionCookie(req: any, res?: Response) {
  if (req?.headers?.['x-session-mode'] === 'cookie' && res) res.clearCookie(cookieName(req), cookieOptions());
}
export function deliverSession<T extends { refreshToken: string; sessionExpiresAt: number }>(req: any, res: Response | undefined, result: T): T | Omit<T, 'refreshToken'> {
  if (req?.headers?.['x-session-mode'] !== 'cookie') return result;
  writeSessionCookie(req, res, result.refreshToken, result.sessionExpiresAt);
  const { refreshToken: _, ...safe } = result;
  return safe;
}
