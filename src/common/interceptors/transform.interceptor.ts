import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
    StreamableFile,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, Observable } from 'rxjs';

export interface ApiResponse<T> {
    data: T | null;
    meta: {
        timestamp: string;
    };
}

/** Metadata key Nest sets on handlers decorated with @Sse(). */
const SSE_METADATA = '__sse__';

/**
 * Wraps every successful response as { data, meta: { timestamp } }.
 * Server-Sent Event streams and file downloads pass through untouched.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
    T,
    ApiResponse<T> | T
> {
    private readonly reflector = new Reflector();

    intercept(
        context: ExecutionContext,
        next: CallHandler<T>,
    ): Observable<ApiResponse<T> | T> {
        const isSse = this.reflector.get<boolean | undefined>(
            SSE_METADATA,
            context.getHandler(),
        );
        if (isSse) return next.handle();

        return next.handle().pipe(
            map((data) =>
                data instanceof StreamableFile
                    ? data
                    : {
                          data: data ?? null,
                          meta: { timestamp: new Date().toISOString() },
                      },
            ),
        );
    }
}
