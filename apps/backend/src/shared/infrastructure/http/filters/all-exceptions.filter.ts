import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';
import { DomainError } from '../../../domain/errors/domain.error';

interface ErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Maps every thrown error to the standard error envelope (SPEC section 4).
 * Internal details and stack traces are NEVER leaked to clients.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const { status, error } = this.resolve(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(error.message, exception instanceof Error ? exception.stack : undefined);
    }

    response.status(status).json({ data: null, meta: null, error });
  }

  private resolve(exception: unknown): { status: number; error: ErrorBody } {
    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      const message =
        typeof res === 'string'
          ? res
          : (((res as Record<string, unknown>).message as string) ?? exception.message);
      const details =
        typeof res === 'object' ? (res as Record<string, unknown>).message : undefined;
      return {
        status: exception.getStatus(),
        error: {
          code: this.codeFromStatus(exception.getStatus()),
          message: Array.isArray(message) ? 'Validation failed' : message,
          ...(Array.isArray(details) ? { details } : {}),
        },
      };
    }

    if (exception instanceof DomainError) {
      return {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        error: { code: exception.code, message: exception.message },
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return {
          status: HttpStatus.CONFLICT,
          error: { code: 'CONFLICT', message: 'Resource already exists' },
        };
      }
      if (exception.code === 'P2025') {
        return {
          status: HttpStatus.NOT_FOUND,
          error: { code: 'NOT_FOUND', message: 'Resource not found' },
        };
      }
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    };
  }

  private codeFromStatus(status: number): string {
    const map: Record<number, string> = {
      400: 'VALIDATION_ERROR',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'RATE_LIMITED',
    };
    return map[status] ?? 'ERROR';
  }
}
