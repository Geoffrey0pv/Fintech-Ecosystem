import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MetaEnvelope } from '../../../application/meta-envelope';

export interface ApiEnvelope<T> {
  data: T | null;
  meta: Record<string, unknown> | null;
  error: null;
}

/**
 * Normalizes every successful response into the standard envelope:
 *   { data, meta, error: null }  (SPEC section 4).
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiEnvelope<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiEnvelope<T>> {
    return next.handle().pipe(
      map((payload) => {
        if (payload instanceof MetaEnvelope) {
          return { data: payload.data as T, meta: payload.meta, error: null };
        }
        return { data: payload ?? null, meta: null, error: null };
      }),
    );
  }
}
