import { Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { initializeDataSource } from './data-source';
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
        const Redis = require('ioredis');
        return new Redis(process.env.REDIS_URL);
      },
    },
  ],
  exports: [DataSource, 'REDIS_CLIENT'],
})
export class DatabaseModule {}
