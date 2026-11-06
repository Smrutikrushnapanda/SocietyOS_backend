import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        if (
          data &&
          typeof data === 'object' &&
          'success' in data &&
          data.success !== undefined
        ) {
          return data;
        }
        return {
          success: true,
          data: data !== undefined ? data : null,
          meta: {
            page: 1,
            limit: 25,
            total:
              typeof data?.length !== 'undefined' ? data.length : undefined,
            totalPages: 1,
          },
        };
      }),
    );
  }
}
