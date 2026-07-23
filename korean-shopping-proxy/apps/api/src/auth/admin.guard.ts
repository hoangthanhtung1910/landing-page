import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService, type AuthenticatedAdmin } from './auth.service';
import { parseCookies } from './cookies';

interface RequestWithAdmin extends Request {
  admin?: AuthenticatedAdmin;
}

/**
 * Guards all admin (write/read) routes (T024, FR-025). Resolves the opaque
 * session cookie to a live admin via the server-side session store; rejects
 * missing/expired/revoked sessions and disabled accounts with `401`. On success
 * it attaches `req.admin` for the CSRF guard and controllers.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithAdmin>();
    const cookies = parseCookies(req.headers.cookie);
    const admin = await this.auth.validateSession(cookies[this.auth.sessionCookieName]);
    if (!admin) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Authentication required.',
      });
    }
    req.admin = admin;
    return true;
  }
}

/** Inject the authenticated admin resolved by `AdminGuard`. */
export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedAdmin => {
    const req = ctx.switchToHttp().getRequest<RequestWithAdmin>();
    return req.admin as AuthenticatedAdmin;
  },
);
