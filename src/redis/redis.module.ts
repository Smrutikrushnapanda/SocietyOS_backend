import { Module } from '@nestjs/common';
import { Redis } from 'ioredis';
import { createResilientRedisClient } from './resilient-redis';

@Module({
  providers: [
    {
      provide: Redis,
      useFactory: () => createResilientRedisClient(process.env.REDIS_URL),
    },
  ],
  exports: [Redis],
})
export class RedisModule {}
