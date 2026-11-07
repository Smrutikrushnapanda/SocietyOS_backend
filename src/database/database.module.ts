import { Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { initializeDataSource } from './data-source';
import { createResilientRedisClient } from '../redis/resilient-redis';

@Module({
  imports: [],
  providers: [
    {
      provide: DataSource,
      useFactory: async () => await initializeDataSource(),
    },
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        return createResilientRedisClient(process.env.REDIS_URL);
      },
    },
  ],
  exports: [DataSource, 'REDIS_CLIENT'],
})
export class DatabaseModule {}
