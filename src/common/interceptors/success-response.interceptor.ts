import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { ApiSuccessResponse } from '../types/response.types';

@Injectable()
export class SuccessResponseInterceptor<T> implements NestInterceptor<T, ApiSuccessResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiSuccessResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        ok: true,
        data,
      })),
    );
  }
}
