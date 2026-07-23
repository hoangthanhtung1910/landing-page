import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCorsOrigins, parseTrustProxy, validateEnv } from '../src/config/env.validation';

// --- parseCorsOrigins (R2-P2-02) ---

test('accepts valid local and production origins', () => {
  assert.deepEqual(parseCorsOrigins('http://localhost:3000,http://localhost:3001'), [
    'http://localhost:3000',
    'http://localhost:3001',
  ]);
  assert.deepEqual(parseCorsOrigins('https://admin.example.com'), ['https://admin.example.com']);
});

test('rejects an empty or comma-only list', () => {
  assert.throws(() => parseCorsOrigins(''), /at least one origin/);
  assert.throws(() => parseCorsOrigins(','), /at least one origin/);
  assert.throws(() => parseCorsOrigins(' , '), /at least one origin/);
});

test('rejects wildcards', () => {
  assert.throws(() => parseCorsOrigins('*'), /wildcard/i);
  assert.throws(() => parseCorsOrigins('https://*.example.com'), /wildcard/i);
});

test('rejects non-HTTP(S) schemes', () => {
  assert.throws(() => parseCorsOrigins('ftp://example.com'), /http or https/);
  assert.throws(() => parseCorsOrigins('ws://example.com'), /http or https/);
});

test('rejects credentials, path, query, and fragment', () => {
  assert.throws(() => parseCorsOrigins('http://user:pass@example.com'), /credentials/);
  assert.throws(() => parseCorsOrigins('https://example.com/admin'), /bare origins|no path/);
  assert.throws(() => parseCorsOrigins('https://example.com?x=1'), /query|bare origin/);
  assert.throws(() => parseCorsOrigins('https://example.com#frag'), /fragment|bare origin/);
});

test('rejects garbage that is not a URL', () => {
  assert.throws(() => parseCorsOrigins('not a url'), /invalid origin/);
});

// --- validateEnv semantic rules ---

const baseEnv = {
  MONGO_URI: 'mongodb://127.0.0.1:27017/vyvy',
  SESSION_SECRET: 'a-sufficiently-long-secret',
  CORS_ORIGINS: 'http://localhost:3000',
};

test('accepts a minimal valid environment', () => {
  const v = validateEnv({ ...baseEnv });
  assert.equal(v.PORT, 4000);
  assert.equal(v.STORAGE_DRIVER, 'local');
});

test('rejects invalid CORS at boot', () => {
  assert.throws(() => validateEnv({ ...baseEnv, CORS_ORIGINS: 'ftp://example.com' }));
  assert.throws(() => validateEnv({ ...baseEnv, CORS_ORIGINS: ',' }));
});

test('SameSite=none requires Secure cookie', () => {
  assert.throws(
    () =>
      validateEnv({
        ...baseEnv,
        SESSION_COOKIE_SAMESITE: 'none',
        SESSION_COOKIE_SECURE: 'false',
      }),
    /requires SESSION_COOKIE_SECURE/,
  );
  // and passes when secure
  const v = validateEnv({
    ...baseEnv,
    SESSION_COOKIE_SAMESITE: 'none',
    SESSION_COOKIE_SECURE: 'true',
  });
  assert.equal(v.SESSION_COOKIE_SAMESITE, 'none');
});

test('production refuses default secrets and non-secure cookies', () => {
  assert.throws(
    () =>
      validateEnv({
        ...baseEnv,
        NODE_ENV: 'production',
        SESSION_SECRET: 'change-me',
        SESSION_COOKIE_SECURE: 'true',
      }),
    /SESSION_SECRET/,
  );
  assert.throws(
    () =>
      validateEnv({
        ...baseEnv,
        NODE_ENV: 'production',
        SEED_ADMIN_PASSWORD: 'a-real-strong-password',
        SESSION_COOKIE_SECURE: 'false',
      }),
    /SESSION_COOKIE_SECURE/,
  );
  assert.throws(
    () =>
      validateEnv({
        ...baseEnv,
        NODE_ENV: 'production',
        SESSION_COOKIE_SECURE: 'true',
        SEED_ADMIN_PASSWORD: 'change-me-immediately',
      }),
    /SEED_ADMIN_PASSWORD/,
  );
});

test('rejects invalid STORAGE_DRIVER and bad MONGO_URI', () => {
  assert.throws(() => validateEnv({ ...baseEnv, STORAGE_DRIVER: 'ftp' }));
  assert.throws(() => validateEnv({ ...baseEnv, MONGO_URI: 'mysql://x' }));
});

// --- TRUST_PROXY (login-throttle IP source) ---

test('parseTrustProxy maps values to an Express trust-proxy setting', () => {
  assert.equal(parseTrustProxy(undefined), false);
  assert.equal(parseTrustProxy(''), false);
  assert.equal(parseTrustProxy('false'), false);
  assert.equal(parseTrustProxy('true'), true);
  assert.equal(parseTrustProxy('1'), 1);
  assert.equal(parseTrustProxy('2'), 2);
  assert.deepEqual(parseTrustProxy('loopback,10.0.0.0/8'), ['loopback', '10.0.0.0/8']);
});

test('production refuses TRUST_PROXY=true (spoofable X-Forwarded-For bypasses the login limit)', () => {
  assert.throws(
    () =>
      validateEnv({
        ...baseEnv,
        NODE_ENV: 'production',
        SESSION_SECRET: 'a-sufficiently-long-secret',
        SESSION_COOKIE_SECURE: 'true',
        SEED_ADMIN_PASSWORD: 'a-real-strong-password',
        TRUST_PROXY: 'true',
      }),
    /TRUST_PROXY must not be "true" in production/,
  );
  // A specific hop count is allowed in production.
  const v = validateEnv({
    ...baseEnv,
    NODE_ENV: 'production',
    SESSION_SECRET: 'a-sufficiently-long-secret',
    SESSION_COOKIE_SECURE: 'true',
    SEED_ADMIN_PASSWORD: 'a-real-strong-password',
    TRUST_PROXY: '1',
  });
  assert.equal(v.TRUST_PROXY, '1');
});
