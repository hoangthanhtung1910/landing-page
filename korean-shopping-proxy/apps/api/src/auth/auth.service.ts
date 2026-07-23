import { randomBytes, timingSafeEqual } from 'node:crypto';
import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';

interface AdminUserDoc {
  _id: Types.ObjectId;
  username: string;
  passwordHash: string;
  enabled: boolean;
}

interface AdminSessionDoc {
  _id: string;
  userId: Types.ObjectId;
  username: string;
  csrfToken: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

interface LoginAttemptDoc {
  _id: string;
  fails: number;
  windowStart: Date | null;
  lockedUntil: Date | null;
}

export interface AuthenticatedAdmin {
  userId: string;
  username: string;
  sessionId: string;
  csrfToken: string;
}

export interface LoginResult {
  sessionId: string;
  csrfToken: string;
  username: string;
  ttlMs: number;
}

/** Constant-time string comparison that never short-circuits on content. */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/**
 * Cookie-session admin auth (T024) + lifecycle hardening (T024B). Sessions are
 * server-side records (opaque cookie token) so logout/disable revoke immediately.
 * Login is throttled per username; auth-relevant actions are security-logged.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  readonly sessionCookieName: string;
  readonly csrfCookieName: string;
  private readonly ttlMs: number;
  private readonly maxAttempts: number;
  private readonly lockoutMs: number;
  private readonly windowMs: number;

  constructor(
    @Inject(ConfigService) private readonly config: ConfigService,
    @InjectModel('AdminUser') private readonly users: Model<AdminUserDoc>,
    @InjectModel('AdminSession') private readonly sessions: Model<AdminSessionDoc>,
    @InjectModel('LoginAttempt') private readonly attempts: Model<LoginAttemptDoc>,
    @InjectModel('SecurityEvent') private readonly events: Model<Record<string, unknown>>,
  ) {
    this.sessionCookieName = config.get<string>('SESSION_COOKIE_NAME') ?? 'vyvy_admin_session';
    this.csrfCookieName = `${this.sessionCookieName}_csrf`;
    this.ttlMs = (config.get<number>('SESSION_TTL_HOURS') ?? 12) * 3_600_000;
    this.maxAttempts = config.get<number>('LOGIN_MAX_ATTEMPTS') ?? 5;
    this.lockoutMs = (config.get<number>('LOGIN_LOCKOUT_MINUTES') ?? 15) * 60_000;
    this.windowMs = (config.get<number>('LOGIN_ATTEMPT_WINDOW_MINUTES') ?? 15) * 60_000;
  }

  get sessionTtlMs(): number {
    return this.ttlMs;
  }

  /** Append a security event (best-effort — logging must never break auth). */
  private async logEvent(
    type: string,
    data: { username?: string | null; ip?: string | null; detail?: unknown } = {},
  ): Promise<void> {
    const entry = {
      type,
      username: data.username ?? null,
      ip: data.ip ?? null,
      detail: data.detail ?? null,
      at: new Date(),
    };
    this.logger.log(`security:${type} ${data.username ?? '-'} ${data.ip ?? '-'}`);
    try {
      await this.events.create(entry);
    } catch (err) {
      this.logger.warn(`failed to persist security event: ${(err as Error).message}`);
    }
  }

  /**
   * Throttle key = lowercased username + client IP. Keying by username ALONE would
   * let an attacker lock a known admin out remotely (DoS); binding the lock to the
   * source IP means a victim's own logins from their own IP are unaffected (P1-1).
   */
  private throttleKey(username: string, ip: string | null): string {
    return `${username.trim().toLowerCase()}|${ip ?? 'unknown'}`;
  }

  /**
   * Atomically RESERVE an attempt slot BEFORE any password verification. This is
   * the rate limit's core guarantee: a single aggregation-pipeline update bumps the
   * in-window counter (resetting a stale window) and returns the new state, so N
   * concurrent logins each receive a distinct, monotonically-increasing `fails`.
   * Callers verify the password only when within budget — concurrent requests past
   * the threshold are rejected WITHOUT a bcrypt check (closes the pre-verification
   * bypass, P1-2). Reservation happens for every attempt (successful logins clear it).
   */
  private async reserveAttempt(key: string, now: Date): Promise<LoginAttemptDoc> {
    const windowCutoff = new Date(now.getTime() - this.windowMs);
    const doc = await this.attempts
      .findOneAndUpdate(
        { _id: key },
        [
          {
            $set: {
              windowStart: {
                $cond: [{ $lt: ['$windowStart', windowCutoff] }, now, { $ifNull: ['$windowStart', now] }],
              },
              fails: {
                $cond: [
                  { $lt: ['$windowStart', windowCutoff] },
                  1,
                  { $add: [{ $ifNull: ['$fails', 0] }, 1] },
                ],
              },
              // A stale window also clears any prior lock.
              lockedUntil: {
                $cond: [{ $lt: ['$windowStart', windowCutoff] }, null, '$lockedUntil'],
              },
            },
          },
        ],
        { upsert: true, new: true },
      )
      .lean<LoginAttemptDoc>()
      .exec();
    // `new: true` guarantees a document; the cast satisfies the types.
    return doc as LoginAttemptDoc;
  }

  /** Set (or extend) the lockout for a key. */
  private async lock(key: string, username: string, now: Date): Promise<Date> {
    const until = new Date(now.getTime() + this.lockoutMs);
    await this.attempts.updateOne({ _id: key }, { $set: { lockedUntil: until } }).exec();
    await this.logEvent('login.locked', { username, detail: { until } });
    return until;
  }

  private async clearThrottle(key: string): Promise<void> {
    await this.attempts.deleteOne({ _id: key }).exec();
  }

  /**
   * Verify credentials and open a session. Throws `429` when over the rate limit and
   * `401` for unknown/disabled account or bad password (without revealing which).
   *
   * The attempt slot is RESERVED atomically before the password check, so the bcrypt
   * verification runs at most `LOGIN_MAX_ATTEMPTS` times per window even under
   * concurrency — requests past the budget are refused up front (P1-2).
   */
  async login(username: string, password: string, ip: string | null): Promise<LoginResult> {
    const key = this.throttleKey(username, ip);
    const name = username.trim();
    const now = new Date();

    const attempt = await this.reserveAttempt(key, now);
    const alreadyLocked = attempt.lockedUntil != null && attempt.lockedUntil > now;
    if (alreadyLocked || attempt.fails > this.maxAttempts) {
      const until = alreadyLocked ? attempt.lockedUntil! : await this.lock(key, name, now);
      await this.logEvent('login.blocked', { username: name, ip, detail: { until } });
      throw new HttpException(
        { code: 'RATE_LIMITED', message: 'Too many login attempts. Try again later.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.users.findOne({ username: name }).exec();
    const ok = user && user.enabled && (await bcrypt.compare(password, user.passwordHash));
    if (!ok) {
      // The failure was already counted by the reservation; lock once at the threshold.
      if (attempt.fails >= this.maxAttempts) await this.lock(key, name, now);
      await this.logEvent('login.failure', {
        username: name,
        ip,
        detail: { reason: !user ? 'unknown' : !user.enabled ? 'disabled' : 'bad_password' },
      });
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Invalid username or password.',
      });
    }

    await this.clearThrottle(key);

    const sessionId = randomBytes(32).toString('hex');
    const csrfToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(now.getTime() + this.ttlMs);
    await this.sessions.create({
      _id: sessionId,
      userId: user._id,
      username: user.username,
      csrfToken,
      expiresAt,
      revokedAt: null,
    });
    await this.logEvent('login.success', { username: user.username, ip });

    return { sessionId, csrfToken, username: user.username, ttlMs: this.ttlMs };
  }

  /**
   * Resolve a session id to the authenticated admin, or null when the session is
   * missing/expired/revoked or the account is disabled (session revoked on the way out).
   */
  async validateSession(sessionId: string | undefined): Promise<AuthenticatedAdmin | null> {
    if (!sessionId) return null;
    const now = new Date();
    const session = await this.sessions.findById(sessionId).exec();
    if (!session || session.revokedAt || session.expiresAt <= now) return null;

    const user = await this.users.findById(session.userId).lean<AdminUserDoc>().exec();
    if (!user || !user.enabled) {
      await this.revoke(sessionId);
      return null;
    }

    return {
      userId: String(session.userId),
      username: session.username,
      sessionId: session._id,
      csrfToken: session.csrfToken,
    };
  }

  /** Revoke a single session (logout / forced). */
  async revoke(sessionId: string): Promise<void> {
    await this.sessions.updateOne({ _id: sessionId }, { $set: { revokedAt: new Date() } }).exec();
  }

  async logout(admin: AuthenticatedAdmin, ip: string | null): Promise<void> {
    await this.revoke(admin.sessionId);
    await this.logEvent('logout', { username: admin.username, ip });
  }

  /** Verify a double-submit CSRF token against the session's stored token. */
  verifyCsrf(sessionCsrf: string, headerToken: string | undefined): boolean {
    if (!headerToken) return false;
    return safeEqual(sessionCsrf, headerToken);
  }

  /**
   * Change the current admin's password (initial-credential rotation, FR-038).
   * Verifies the current password, stores the new hash, and revokes the admin's
   * OTHER sessions (the current one stays live).
   */
  async changePassword(
    admin: AuthenticatedAdmin,
    currentPassword: string,
    newPassword: string,
    ip: string | null,
  ): Promise<void> {
    const user = await this.users.findById(admin.userId).exec();
    if (!user) throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'No such admin.' });

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      await this.logEvent('password.change_failed', { username: user.username, ip });
      throw new HttpException(
        { code: 'VALIDATION', message: 'Current password is incorrect.', details: { field: 'currentPassword' } },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    await this.sessions
      .updateMany(
        { userId: user._id, _id: { $ne: admin.sessionId }, revokedAt: null },
        { $set: { revokedAt: new Date() } },
      )
      .exec();
    await this.logEvent('password.changed', { username: user.username, ip });
  }
}
