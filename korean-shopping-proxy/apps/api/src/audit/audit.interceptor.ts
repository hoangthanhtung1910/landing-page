import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Inject,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Observable } from 'rxjs';
import { from } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import type { AuthenticatedAdmin } from '../auth/auth.service';
import { AuditService } from './audit.service';

interface AuditedRequest extends Request { admin?: AuthenticatedAdmin }

function classify(method: string, path: string): { action: string; targetType: string } | null {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return null;
  if (path.startsWith('/publish')) return { action: 'publish', targetType: 'release' };
  if (path.startsWith('/rollback')) return { action: 'rollback', targetType: 'release' };
  if (path.startsWith('/sections/visibility')) return { action: 'toggleSection', targetType: 'sectionVisibility' };
  if (path.startsWith('/media')) return {
    action: method === 'POST' ? 'mediaUpload' : method === 'PUT' ? 'mediaUpdate' : 'mediaDelete',
    targetType: 'media',
  };
  if (path.startsWith('/content/')) {
    const targetType = path.split('/')[2] ?? 'content';
    const action = path.endsWith('/reorder')
      ? 'reorder'
      : method === 'POST' ? 'create' : method === 'PUT' ? 'update' : 'delete';
    return { action, targetType };
  }
  return null;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(@Inject(AuditService) private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuditedRequest>();
    const classification = classify(request.method, request.path);
    return next.handle().pipe(mergeMap((result: unknown) => {
      if (!classification || !request.admin) return from([result]);
      const response = result as Record<string, unknown> | undefined;
      return from(this.audit.record(request.admin, {
        ...classification,
        targetId: String(response?.id ?? request.params?.id ?? '') || undefined,
        releaseNumber: typeof response?.releaseNumber === 'number' ? response.releaseNumber : undefined,
        before: request.method === 'PUT' ? { expectedVersion: request.body?.version } : undefined,
        after: response,
      })).pipe(map(() => result));
    }));
  }
}
