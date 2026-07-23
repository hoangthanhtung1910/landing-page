import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService, type AuthenticatedAdmin } from './auth.service';
import { AdminGuard, CurrentAdmin } from './admin.guard';
import { CsrfGuard } from './csrf.guard';
import { LoginDto, ChangePasswordDto } from './dto';
import { sessionCookieOptions, csrfCookieOptions, type CookiePolicy } from './cookies';

/**
 * Admin auth endpoints (T024, contracts/admin-api.md). Cookie sessions only —
 * `/auth/login` is unauthenticated; the rest require a valid session, and
 * state-changing routes additionally require a valid CSRF token.
 */
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  private cookiePolicy(): CookiePolicy {
    return {
      secure: this.config.get<boolean>('SESSION_COOKIE_SECURE') ?? false,
      sameSite: (this.config.get<string>('SESSION_COOKIE_SAMESITE') ?? 'lax') as
        | 'lax'
        | 'strict'
        | 'none',
      ttlMs: this.auth.sessionTtlMs,
    };
  }

  private clientIp(req: Request): string | null {
    return req.ip ?? null;
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ username: string; csrfToken: string }> {
    const result = await this.auth.login(dto.username, dto.password, this.clientIp(req));
    const policy = this.cookiePolicy();
    res.cookie(this.auth.sessionCookieName, result.sessionId, sessionCookieOptions(policy));
    res.cookie(this.auth.csrfCookieName, result.csrfToken, csrfCookieOptions(policy));
    return { username: result.username, csrfToken: result.csrfToken };
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(AdminGuard, CsrfGuard)
  async logout(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    await this.auth.logout(admin, this.clientIp(req));
    res.clearCookie(this.auth.sessionCookieName, { path: '/' });
    res.clearCookie(this.auth.csrfCookieName, { path: '/' });
    return { ok: true };
  }

  @Get('me')
  @UseGuards(AdminGuard)
  me(@CurrentAdmin() admin: AuthenticatedAdmin): { username: string } {
    return { username: admin.username };
  }

  @Get('csrf')
  @UseGuards(AdminGuard)
  csrf(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Res({ passthrough: true }) res: Response,
  ): { csrfToken: string } {
    res.cookie(this.auth.csrfCookieName, admin.csrfToken, csrfCookieOptions(this.cookiePolicy()));
    return { csrfToken: admin.csrfToken };
  }

  @Post('password')
  @HttpCode(200)
  @UseGuards(AdminGuard, CsrfGuard)
  async changePassword(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ): Promise<{ ok: true }> {
    await this.auth.changePassword(admin, dto.currentPassword, dto.newPassword, this.clientIp(req));
    return { ok: true };
  }
}
