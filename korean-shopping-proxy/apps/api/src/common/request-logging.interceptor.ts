import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const started = performance.now();
    return next.handle().pipe(finalize(() => {
      const record = { level: 'info', event: 'http.request', method: request.method, path: request.path, status: response.statusCode, durationMs: Math.round((performance.now() - started) * 10) / 10, at: new Date().toISOString() };
      process.stdout.write(`${JSON.stringify(record)}\n`);
    }));
  }
}
