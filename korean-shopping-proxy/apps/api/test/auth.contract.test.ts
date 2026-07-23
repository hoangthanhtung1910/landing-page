import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';

/**
 * T034C — auth-lifecycle & authorization-policy tests (FR-025/FR-038, SC-010/SC-019).
 * Boots the full Nest HTTP app against a local Mongo and drives /auth/* over HTTP.
 * Gated behind RUN_MONGO_TESTS=1 (Codex sandbox denies localhost Mongo). Run with:
 *   RUN_MONGO_TESTS=1 MONGO_TEST_URI=mongodb://127.0.0.1:27017/vyvy_authtest pnpm --filter api test
 */
const RUN = process.env.RUN_MONGO_TESTS === '1';

let app: INestApplication | undefined;
let base = '';
let AdminUser: Model<Record<string, unknown>>;
let AdminSession: Model<Record<string, unknown>>;
let SecurityEvent: Model<Record<string, unknown>>;

const PASSWORD = 'correct-horse-battery';

async function makeAdmin(username: string, opts: { enabled?: boolean } = {}): Promise<void> {
  await AdminUser.create({
    username,
    passwordHash: await bcrypt.hash(PASSWORD, 10),
    enabled: opts.enabled ?? true,
  });
}

interface LoginOk {
  status: number;
  cookieHeader: string;
  csrfToken: string;
}

async function login(username: string, password = PASSWORD): Promise<LoginOk> {
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const setCookies = res.headers.getSetCookie();
  const cookieHeader = setCookies.map((c) => c.split(';')[0]).join('; ');
  let csrfToken = '';
  if (res.ok) {
    const body = (await res.json()) as { csrfToken?: string };
    csrfToken = body.csrfToken ?? '';
  }
  return { status: res.status, cookieHeader, csrfToken };
}

before(async () => {
  if (!RUN) return;
  process.env.MONGO_URI =
    process.env.MONGO_TEST_URI ?? 'mongodb://127.0.0.1:27017/vyvy_authtest';
  process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'test-session-secret-value';
  process.env.CORS_ORIGINS = process.env.CORS_ORIGINS ?? 'http://localhost:3000';
  // Small, fast throttle bounds for the lockout test.
  process.env.LOGIN_MAX_ATTEMPTS = '3';
  process.env.LOGIN_LOCKOUT_MINUTES = '15';
  process.env.LOGIN_ATTEMPT_WINDOW_MINUTES = '15';

  const { NestFactory } = await import('@nestjs/core');
  const { ValidationPipe } = await import('@nestjs/common');
  const { AppModule } = await import('../src/app.module');
  const { AllExceptionsFilter } = await import('../src/common/http-exception.filter');

  app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.listen(0);
  base = await app.getUrl();

  AdminUser = app.get<Model<Record<string, unknown>>>(getModelToken('AdminUser'));
  AdminSession = app.get<Model<Record<string, unknown>>>(getModelToken('AdminSession'));
  SecurityEvent = app.get<Model<Record<string, unknown>>>(getModelToken('SecurityEvent'));
  // Clean slate.
  await AdminUser.deleteMany({}).exec();
  await AdminSession.deleteMany({}).exec();
});

after(async () => {
  if (app) {
    const { getConnectionToken } = await import('@nestjs/mongoose');
    const conn = app.get(getConnectionToken()) as { dropDatabase(): Promise<void> };
    await conn.dropDatabase();
    await app.close();
  }
});

test('unauthenticated protected routes return 401', { skip: !RUN }, async () => {
  const me = await fetch(`${base}/auth/me`);
  assert.equal(me.status, 401);
  assert.equal((await me.json()).error.code, 'UNAUTHENTICATED');

  const logout = await fetch(`${base}/auth/logout`, { method: 'POST' });
  assert.equal(logout.status, 401);
});

test('valid login opens a session; /auth/me returns the admin', { skip: !RUN }, async () => {
  await makeAdmin('alice');
  const { status, cookieHeader, csrfToken } = await login('alice');
  assert.equal(status, 200);
  assert.ok(csrfToken.length > 0, 'login returns a csrf token');
  assert.match(cookieHeader, /vyvy_admin_session=/);

  const me = await fetch(`${base}/auth/me`, { headers: { cookie: cookieHeader } });
  assert.equal(me.status, 200);
  assert.equal((await me.json()).username, 'alice');
});

test('wrong password is 401; the account locks out (429) after the threshold', { skip: !RUN }, async () => {
  await makeAdmin('bob');
  for (let i = 0; i < 3; i++) {
    const r = await login('bob', 'wrong-password');
    assert.equal(r.status, 401, `attempt ${i + 1} should be 401`);
  }
  // Now locked: even the CORRECT password is refused with 429.
  const locked = await login('bob', PASSWORD);
  assert.equal(locked.status, 429);
});

test('concurrent logins cannot bypass the rate limit — password verified at most N times (P1-2)', { skip: !RUN }, async () => {
  await makeAdmin('ivan');
  // Fire 10 simultaneous wrong-password logins (threshold is 3). The attempt slot is
  // reserved atomically BEFORE the password check, so the excess must be rejected
  // with 429 up front — the bcrypt verification (which emits a `login.failure`
  // security event) must run at most `LOGIN_MAX_ATTEMPTS` (=3) times.
  const results = await Promise.all(
    Array.from({ length: 10 }, () => login('ivan', 'wrong-password')),
  );
  const unauthorized = results.filter((r) => r.status === 401).length;
  const rateLimited = results.filter((r) => r.status === 429).length;

  const verified = await SecurityEvent.countDocuments({ type: 'login.failure', username: 'ivan' });
  assert.ok(verified <= 3, `password verified ${verified}× — must be <= 3 (no pre-verification bypass)`);
  assert.ok(unauthorized <= 3, `at most 3 requests reach password verification (got ${unauthorized})`);
  assert.ok(rateLimited >= 7, `the excess must be refused up front with 429 (got ${rateLimited})`);

  // And the account is locked afterwards.
  const locked = await login('ivan', PASSWORD);
  assert.equal(locked.status, 429, 'account is locked after concurrent failures');
});

test('a malformed cookie does not 500 (falls back to raw value → 401)', { skip: !RUN }, async () => {
  // A stray percent-encoding would throw in decodeURIComponent if unguarded.
  const res = await fetch(`${base}/auth/me`, {
    headers: { cookie: 'vyvy_admin_session=%E0%A4%A; other=%' },
  });
  assert.equal(res.status, 401, 'malformed cookie must be treated as unauthenticated, not a 500');
  assert.equal((await res.json()).error.code, 'UNAUTHENTICATED');
});

test('disabled account cannot authenticate (401)', { skip: !RUN }, async () => {
  await makeAdmin('carol', { enabled: false });
  const r = await login('carol');
  assert.equal(r.status, 401);
});

test('logout revokes the session (subsequent use is 401)', { skip: !RUN }, async () => {
  await makeAdmin('dave');
  const { cookieHeader, csrfToken } = await login('dave');

  const out = await fetch(`${base}/auth/logout`, {
    method: 'POST',
    headers: { cookie: cookieHeader, 'x-csrf-token': csrfToken },
  });
  assert.equal(out.status, 200);

  const me = await fetch(`${base}/auth/me`, { headers: { cookie: cookieHeader } });
  assert.equal(me.status, 401);
});

test('expired session is rejected (401)', { skip: !RUN }, async () => {
  await makeAdmin('erin');
  const { cookieHeader } = await login('erin');

  // Force the session to be past its expiry.
  await AdminSession.updateMany(
    { username: 'erin' },
    { $set: { expiresAt: new Date(Date.now() - 1000) } },
  ).exec();

  const me = await fetch(`${base}/auth/me`, { headers: { cookie: cookieHeader } });
  assert.equal(me.status, 401);
});

test('disabling an account mid-session revokes access (401)', { skip: !RUN }, async () => {
  await makeAdmin('frank');
  const { cookieHeader } = await login('frank');

  await AdminUser.updateOne({ username: 'frank' }, { $set: { enabled: false } }).exec();

  const me = await fetch(`${base}/auth/me`, { headers: { cookie: cookieHeader } });
  assert.equal(me.status, 401);
});

test('CSRF: state-changing route needs a valid token', { skip: !RUN }, async () => {
  await makeAdmin('grace');
  const { cookieHeader, csrfToken } = await login('grace');

  // Missing token → 403 CSRF.
  const noToken = await fetch(`${base}/auth/logout`, {
    method: 'POST',
    headers: { cookie: cookieHeader },
  });
  assert.equal(noToken.status, 403);
  assert.equal((await noToken.json()).error.code, 'CSRF');

  // Wrong token → 403.
  const badToken = await fetch(`${base}/auth/logout`, {
    method: 'POST',
    headers: { cookie: cookieHeader, 'x-csrf-token': 'nope' },
  });
  assert.equal(badToken.status, 403);

  // Correct token → 200.
  const ok = await fetch(`${base}/auth/logout`, {
    method: 'POST',
    headers: { cookie: cookieHeader, 'x-csrf-token': csrfToken },
  });
  assert.equal(ok.status, 200);
});

test('password rotation requires the correct current password and revokes other sessions', { skip: !RUN }, async () => {
  await makeAdmin('heidi');
  const first = await login('heidi');
  const second = await login('heidi'); // a second concurrent session

  // Wrong current password → 422.
  const bad = await fetch(`${base}/auth/password`, {
    method: 'POST',
    headers: {
      cookie: first.cookieHeader,
      'x-csrf-token': first.csrfToken,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ currentPassword: 'nope', newPassword: 'brand-new-passphrase' }),
  });
  assert.equal(bad.status, 422);

  // Correct current password → 200, and the OTHER session is revoked.
  const okRes = await fetch(`${base}/auth/password`, {
    method: 'POST',
    headers: {
      cookie: first.cookieHeader,
      'x-csrf-token': first.csrfToken,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ currentPassword: PASSWORD, newPassword: 'brand-new-passphrase' }),
  });
  assert.equal(okRes.status, 200);

  const secondMe = await fetch(`${base}/auth/me`, { headers: { cookie: second.cookieHeader } });
  assert.equal(secondMe.status, 401, 'other sessions are revoked after a password change');

  const firstMe = await fetch(`${base}/auth/me`, { headers: { cookie: first.cookieHeader } });
  assert.equal(firstMe.status, 200, 'the initiating session stays valid');
});
