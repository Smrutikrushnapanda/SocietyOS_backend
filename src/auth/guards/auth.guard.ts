import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthGuard {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();

    const authorization = request.headers['authorization'];

    if (!authorization) {
      return false;
    }

    const token = authorization.startsWith('Bearer ')
      ? authorization.substring(7)
      : undefined;

    if (!token) {
      return false;
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_ACCESS_TOKEN_SECRET,
      });

      request.user = {
        id: payload.sub,
        mobileNumber: payload.mobileNumber,
      };
      return true;
    } catch (err) {
      return false;
    }
  }
}
