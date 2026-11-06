import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Optional } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService, @Optional() private readonly auth?: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers['authorization'];
    if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) throw new UnauthorizedException('Authentication required');
    let payload: { sub: string; sid: string; mobileNumber?: string; exp: number };
    try {
      payload = this.jwtService.verify(authorization.slice(7), { secret: process.env.JWT_ACCESS_TOKEN_SECRET, algorithms: ['HS256'] });
      if (!payload.sub || !payload.sid || !Number.isFinite(payload.exp)) throw new Error('Invalid claims');
    } catch { throw new UnauthorizedException('Access token expired or invalid'); }
    if (!this.auth) throw new UnauthorizedException('Session verification unavailable');
    await this.auth.validateAccessSession(payload.sid, payload.sub, request.headers['x-organization-id']);
    request.user = { id: payload.sub, mobileNumber: payload.mobileNumber, sessionId: payload.sid };
    return true;
  }
}
