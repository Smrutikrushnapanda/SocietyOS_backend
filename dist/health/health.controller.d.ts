import { DataSource } from 'typeorm';
import { Redis } from 'ioredis';
export declare class HealthController {
    private readonly dataSource;
    private readonly redis;
    constructor(dataSource: DataSource, redis: Redis);
    healthCheck(): Promise<{
        status: string;
        timestamp: string;
        database: string;
        redis: string;
    }>;
    private checkRedis;
    private checkDatabase;
}
