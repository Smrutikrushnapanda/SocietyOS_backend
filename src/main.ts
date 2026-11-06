import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe, RequestMethod } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { AllExceptionsFilter } from './common/filters/exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import {
  RateLimitMiddleware,
  TenantIsolationMiddleware,
} from './common/middleware';
import { initializeDataSource } from './database/data-source';
import { validate } from './config/config.validation';

async function bootstrap() {
  // Validate environment configuration fail-safe before starting
  validate();

  const isProduction = process.env.NODE_ENV === 'production';

  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    logger: isProduction ? ['error', 'warn', 'log'] : ['error', 'warn', 'log', 'debug'],
  });

  app.use('/favicon.ico', (_req: any, res: any) => res.status(204).end());

  // HTTP Security Headers + CORS middleware
  app.use((req: any, res: any, next: any) => {
    const origin = req.headers.origin;
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Organization-Id,x-organizer-id,X-Portal-Role,x-portal-role,Accept,X-Requested-With,X-Session-Mode');
      res.setHeader('Access-Control-Max-Age', '86400');
      return res.status(204).end();
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    if (req.path.startsWith('/api/v1/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    next();
  });

  // CORS configuration
  const defaultOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
  ];
  const envOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : [];
  const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

  app.enableCors({
    origin: false,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Organization-Id',
      'x-organization-id',
      'X-Portal-Role',
      'x-portal-role',
      'Accept',
      'X-Requested-With',
      'X-Session-Mode',
    ],
    credentials: true,
  });

  // Request body size limits
  app.use(json({ limit: '1mb', verify: (req: any, _res, buffer) => { req.rawBody = Buffer.from(buffer); } }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      errorHttpStatusCode: 400,
      skipMissingProperties: false,
    }),
  );

  // Global interceptors
  app.useGlobalInterceptors(
    new TransformInterceptor(),
    new LoggingInterceptor(),
  );

  // Exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Apply middlewares directly
  app.use(RateLimitMiddleware);
  app.use(TenantIsolationMiddleware);

  // API prefix (root path excluded so GET / reports service status)
  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: '/', method: RequestMethod.GET }],
  });

  // Swagger configuration (enabled in dev, or explicitly via ENABLE_SWAGGER=true)
  const enableSwagger = !isProduction || process.env.ENABLE_SWAGGER === 'true';
  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle(process.env.SWAGGER_TITLE || 'SocietyOS API')
      .setDescription(
        process.env.SWAGGER_DESCRIPTION ||
          'Multi-tenant residential society management platform',
      )
      .setVersion(process.env.SWAGGER_VERSION || '1.0.0')
      .addTag('SocietyOS')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(process.env.PORT ?? 5050);
  console.log(`🚀 SocietyOS Backend running on ${await app.getUrl()}`);
  if (enableSwagger) {
    console.log(`📖 Swagger documentation available at /api/docs`);
  }
}
bootstrap();
