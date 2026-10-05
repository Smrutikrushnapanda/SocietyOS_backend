import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { validate } from './config.validation';

@Module({
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {
  constructor(private configService: ConfigService) {
    // Validation is called at application bootstrap
  }
}
