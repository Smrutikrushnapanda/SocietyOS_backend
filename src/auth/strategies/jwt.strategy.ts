import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy {
  constructor() {}

  async validateUser(payload: any): Promise<any> {
    return {
      id: payload.sub,
      mobileNumber: payload.mobileNumber,
    };
  }
}
