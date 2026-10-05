import { Controller, Get, HttpCode, HttpStatus, Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Redis } from 'ioredis';

@Controller()
export class HealthController {
  constructor(
    @Inject(DataSource) private readonly dataSource: DataSource,
    @Inject(Redis) private readonly redis: Redis,
  ) {}

  @Get('health')
  @HttpCode(HttpStatus.OK)
  async healthCheck() {
    const dbStatus = this.checkDatabase();
    const redisStatus = await this.checkRedis();

    const status = dbStatus && redisStatus ? 'healthy' : 'unhealthy';

    return {
      status,
      timestamp: new Date().toISOString(),
      database: dbStatus ? 'connected' : 'disconnected',
      redis: redisStatus ? 'connected' : 'disconnected',
    };
  }

  private async checkRedis(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch {
      return false;
    }
  }

  private checkDatabase(): boolean {
    try {
      this.dataSource.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
