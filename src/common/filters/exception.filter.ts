import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Logger } from '@nestjs/common';

@Catch(HttpException)
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    const responseBody = {
      success: false,
      error: {
        code: exception.getStatus(),
        message: exception.message,
      },
    };

    // Log the error
    this.logger.error(
      `HTTP ${status}: ${exception.message}`,
      exception.stack,
      `Path: ${request.method} ${request.url}`,
    );

    // Consistent error response
    response.status(status).json(responseBody);
  }
}
