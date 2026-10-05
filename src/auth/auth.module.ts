import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './controllers/auth.controller';
import { AuthGuard } from './guards/auth.guard';
import { MockOTPProvider } from '../auth/providers/MockOTPProvider';
import { DatabaseModule } from '../database/database.module';
import { forwardRef } from '@nestjs/common';

const OTP_PROVIDER_TOKEN = 'OTP_PROVIDER';

@Global()
@Module({
  imports: [
    forwardRef(() => DatabaseModule),
    JwtModule.register({}),
  ],
  providers: [
    AuthService,
    AuthGuard,
    {
      provide: OTP_PROVIDER_TOKEN,
      useClass: MockOTPProvider,
    },
  ],
  controllers: [AuthController],
  exports: [AuthService, AuthGuard, JwtModule, OTP_PROVIDER_TOKEN],
})
export class AuthModule {}
