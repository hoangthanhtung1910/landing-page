import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService, type AuthenticatedAdmin } from './auth.service';

interface RequestWithAdmin extends Request {
  admin?: AuthenticatedAdmin;
}

const STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * CSRF protection for state-changing admin requests (T024, FR-025). Must run
 * AFTER `AdminGuard` (which sets `req.admin`). Verifies the double-submit
 * `x-csrf-token` header against the session's server-side token. Safe methods
 * (GET/HEAD/OPTIONS) pass through.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RequestWithAdmin>();
    if (!STATE_CHANGING.has(req.method.toUpperCase())) return true;

    const admin = req.admin;
    if (!admin) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Authentication required.',
      });
    }

    const header = req.headers['x-csrf-token'];
    const token = Array.isArray(header) ? header[0] : header;
    if (!this.auth.verifyCsrf(admin.csrfToken, token)) {
      throw new ForbiddenException({
        code: 'CSRF',
        message: 'Invalid or missing CSRF token.',
      });
    }
    return true;
  }
}
