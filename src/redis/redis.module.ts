import { Module } from '@nestjs/common';
import { Redis } from 'ioredis';

@Module({
  providers: [Redis],
  exports: [Redis],
})
export class RedisModule {}
