import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Logger } from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'object' && res !== null && 'message' in res
        ? (res as any).message
        : exception.message;

      // When a route guard returns false for an unauthenticated request (no request.user),
      // NestJS core throws new ForbiddenException('Forbidden resource').
      // Map this to Unauthorized (401) to preserve the HTTP distinction between 401 (unauthenticated) and 403 (unauthorized).
      if (
        status === HttpStatus.FORBIDDEN &&
        (message === 'Forbidden resource' || (typeof res === 'object' && (res as any)?.message === 'Forbidden resource')) &&
        !(request as any)?.user
      ) {
        status = HttpStatus.UNAUTHORIZED;
        message = 'Authentication required or token expired';
      }
    } else if (
      exception &&
      typeof exception === 'object' &&
      'code' in exception &&
      (exception as any).code === '22P02'
    ) {
      // PostgreSQL 22P02: invalid text representation (e.g. invalid input syntax for type uuid)
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid identifier or syntax';
    }

    const responseBody = {
      success: false,
      error: {
        code: status,
        message,
      },
    };

    // Log the error
    this.logger.error(
      `HTTP ${status}: ${typeof message === 'object' ? JSON.stringify(message) : message}`,
      exception instanceof Error ? exception.stack : undefined,
      `Path: ${request.method} ${request.url}`,
    );

    // Consistent error response
    response.status(status).json(responseBody);
  }
}
