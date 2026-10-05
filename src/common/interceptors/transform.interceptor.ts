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
        if (data.success === undefined) {
          return {
            success: true,
            data,
            meta: {
              page: 1,
              limit: 25,
              total:
                typeof data?.length !== 'undefined' ? data.length : undefined,
              totalPages: 1,
            },
          };
        }
        return data;
      }),
    );
  }
}
