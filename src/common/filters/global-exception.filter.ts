import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ResolvedError {
    status: number;
    error: string;
    message: string | string[];
}

interface PrismaKnownError {
    code: string;
    meta?: Record<string, unknown>;
}

/**
 * Turns every failure into one response shape:
 * { statusCode, error, message, path, timestamp }
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse<Response>();

        const { status, error, message } = this.resolve(exception);
        this.log(request, status, message, exception);

        // A streaming response (SSE) may already have started.
        if (response.headersSent) return;

        response.status(status).json({
            statusCode: status,
            error,
            message,
            path: request.originalUrl.split('?')[0],
            timestamp: new Date().toISOString(),
        });
    }

    private resolve(exception: unknown): ResolvedError {
        if (exception instanceof HttpException) {
            const status = exception.getStatus();
            const body = exception.getResponse();
            if (typeof body === 'string') {
                return { status, error: this.statusText(status), message: body };
            }
            const detail = body as {
                message?: string | string[];
                error?: string;
            };
            return {
                status,
                error: detail.error ?? this.statusText(status),
                message: detail.message ?? exception.message,
            };
        }

        const prismaError = this.asPrismaKnownError(exception);
        const mapped = prismaError ? this.mapPrismaError(prismaError) : null;
        if (mapped) return mapped;

        const clientError = this.asClientError(exception);
        if (clientError) return clientError;

        return {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            error: this.statusText(HttpStatus.INTERNAL_SERVER_ERROR),
            message: 'Internal server error',
        };
    }

    /** Detects Prisma request errors without importing the generated client. */
    private asPrismaKnownError(exception: unknown): PrismaKnownError | null {
        if (typeof exception !== 'object' || exception === null) return null;
        const candidate = exception as {
            name?: unknown;
            code?: unknown;
            meta?: unknown;
        };
        if (
            candidate.name !== 'PrismaClientKnownRequestError' ||
            typeof candidate.code !== 'string'
        ) {
            return null;
        }
        return {
            code: candidate.code,
            meta: candidate.meta as Record<string, unknown> | undefined,
        };
    }

    private mapPrismaError(error: PrismaKnownError): ResolvedError | null {
        const build = (status: number, message: string): ResolvedError => ({
            status,
            error: this.statusText(status),
            message,
        });

        switch (error.code) {
            case 'P2002': {
                const target = error.meta?.target;
                const fields = Array.isArray(target)
                    ? target.join(', ')
                    : undefined;
                return build(
                    HttpStatus.CONFLICT,
                    fields
                        ? `A record with the same ${fields} already exists`
                        : 'A record with the same unique value already exists',
                );
            }
            case 'P2025':
                return build(HttpStatus.NOT_FOUND, 'Record not found');
            case 'P2003':
                return build(
                    HttpStatus.CONFLICT,
                    'The operation conflicts with related records',
                );
            case 'P2034':
                return build(
                    HttpStatus.CONFLICT,
                    'The request conflicted with another operation. Please retry.',
                );
            case 'P2023':
                return build(HttpStatus.BAD_REQUEST, 'Invalid value supplied');
            default:
                return null;
        }
    }

    /** Handles 4xx errors raised outside Nest, such as malformed JSON bodies. */
    private asClientError(exception: unknown): ResolvedError | null {
        if (typeof exception !== 'object' || exception === null) return null;
        const candidate = exception as {
            status?: unknown;
            statusCode?: unknown;
            type?: unknown;
            message?: unknown;
        };
        const status =
            typeof candidate.statusCode === 'number'
                ? candidate.statusCode
                : typeof candidate.status === 'number'
                  ? candidate.status
                  : undefined;
        if (!status || status < 400 || status > 499) return null;

        const message =
            candidate.type === 'entity.parse.failed'
                ? 'Malformed JSON body'
                : typeof candidate.message === 'string'
                  ? candidate.message
                  : this.statusText(status);

        return { status, error: this.statusText(status), message };
    }

    private statusText(status: number): string {
        const name = HttpStatus[status];
        if (!name) return 'Error';
        return name
            .toLowerCase()
            .split('_')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    private log(
        request: Request,
        status: number,
        message: string | string[],
        exception: unknown,
    ): void {
        // Log the route pattern, not the URL: invitation tokens live in the path.
        const route =
            (request.route as { path?: string } | undefined)?.path ??
            request.path;
        const label = `${request.method} ${route} ${status}`;

        if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
            this.logger.error(
                label,
                exception instanceof Error ? exception.stack : String(exception),
            );
        } else {
            this.logger.warn(`${label} - ${JSON.stringify(message)}`);
        }
    }
}