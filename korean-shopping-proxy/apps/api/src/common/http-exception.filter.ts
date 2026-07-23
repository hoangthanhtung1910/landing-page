import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * Standardized error envelope (contracts/admin-api.md):
 *   { "error": { "code": "...", "message": "...", "details"?: {...} } }
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const { code, message, details } = normalize(exception, status);

    res.status(status).json({
      error: { code, message, details },
      path: req.url,
    });
  }
}

function normalize(
  exception: unknown,
  status: number,
): { code: string; message: string; details?: unknown } {
  const codeByStatus: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHENTICATED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'VALIDATION',
    429: 'RATE_LIMITED',
  };
  const code = codeByStatus[status] ?? 'INTERNAL';

  if (exception instanceof HttpException) {
    const body = exception.getResponse();
    if (typeof body === 'string') {
      return { code, message: body };
    }
    const obj = body as Record<string, unknown>;
    return {
      code: (obj.code as string) ?? code,
      message:
        (obj.message as string) ?? exception.message ?? 'Unexpected error',
      details: obj.details ?? obj.errors,
    };
  }

  return { code, message: 'Internal server error' };
}
