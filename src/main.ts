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

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  // CORS configuration
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      errorHttpStatusCode: 400,
      skipMissingProperties: true,
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

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle(process.env.SWAGGER_TITLE || 'SocietyOS API')
    .setDescription(
      process.env.SWAGGER_DESCRIPTION ||
        'Multi-tenant residential society management platform',
    )
    .setVersion(process.env.SWAGGER_VERSION || '1.0.0')
    .addTag('SocietyOS')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 5050);
  console.log(`🚀 SocietyOS Backend running on ${await app.getUrl()}`);
  console.log(`📖 Swagger documentation available at /api/docs`);
}
bootstrap();
