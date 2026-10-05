import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getStatus() {
    return {
      service: 'SocietyOS Backend',
      status: 'running',
      message: 'SocietyOS Backend is running successfully',
      version: process.env.SWAGGER_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      docs: '/api/docs',
      health: '/api/v1/health',
    };
  }
}
