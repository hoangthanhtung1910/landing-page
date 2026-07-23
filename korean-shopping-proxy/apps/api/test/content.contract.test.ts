import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { INestApplication } from '@nestjs/common';

/**
 * T025d — admin content CRUD contract tests for hero, contact, seo (FR-022/029/033/036,
 * admin-api.md). Boots the full Nest app, seeds content, and drives /content/* over
 * HTTP. Gated behind RUN_MONGO_TESTS=1. Run with:
 *   RUN_MONGO_TESTS=1 MONGO_TEST_URI=mongodb://127.0.0.1:27017/vyvy_contenttest pnpm --filter api test
 */
const RUN = process.env.RUN_MONGO_TESTS === '1';
const ADMIN_PASS = 'content-test-admin-pass';

let app: INestApplication | undefined;
let base = '';
let cookie = '';
let csrf = '';
let ContentOrder: { deleteMany(filter: Record<string, unknown>): { exec(): Promise<unknown> } };

const authHeaders = (extra: Record<string, string> = {}): Record<string, string> => ({
  cookie,
  'x-csrf-token': csrf,
  'content-type': 'application/json',
  ...extra,
});

async function jsonReq(
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = authHeaders(),
): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let parsed: Record<string, unknown> = {};
  try {
    parsed = (await res.json()) as Record<string, unknown>;
  } catch {
    /* empty */
  }
  return { status: res.status, body: parsed };
}

before(async () => {
  if (!RUN) return;
  process.env.MONGO_URI =
    process.env.MONGO_TEST_URI ?? 'mongodb://127.0.0.1:27017/vyvy_contenttest';
  process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'test-session-secret-value';
  process.env.CORS_ORIGINS = process.env.CORS_ORIGINS ?? 'http://localhost:3000';
  process.env.SEED_ADMIN_PASSWORD = ADMIN_PASS;

  const { NestFactory } = await import('@nestjs/core');
  const { ValidationPipe } = await import('@nestjs/common');
  const { AppModule } = await import('../src/app.module');
  const { AllExceptionsFilter } = await import('../src/common/http-exception.filter');
  const { runSeed } = await import('../src/seed/seed.core');

  app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.listen(0);
  base = await app.getUrl();

  await runSeed(app, { forceReset: true });

  // Mongoose builds indexes asynchronously; the INV-10 unique `type` index is what
  // makes concurrent creates race-safe, so wait for it before exercising that path.
  const { getModelToken } = await import('@nestjs/mongoose');
  const ContactChannel = app.get(getModelToken('ContactChannel')) as {
    syncIndexes(): Promise<unknown>;
  };
  await ContactChannel.syncIndexes();
  ContentOrder = app.get(getModelToken('ContentOrder')) as {
    deleteMany(filter: Record<string, unknown>): { exec(): Promise<unknown> };
  };

  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: ADMIN_PASS }),
  });
  cookie = res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  csrf = ((await res.json()) as { csrfToken: string }).csrfToken;
});

after(async () => {
  if (app) {
    const { getConnectionToken } = await import('@nestjs/mongoose');
    const conn = app.get(getConnectionToken()) as { dropDatabase(): Promise<void> };
    await conn.dropDatabase();
    await app.close();
  }
});

// --- Auth boundary ---

test('unauthenticated content reads/writes are 401', { skip: !RUN }, async () => {
  const get = await fetch(`${base}/content/hero`);
  assert.equal(get.status, 401);
  const put = await fetch(`${base}/content/hero`, { method: 'PUT' });
  assert.equal(put.status, 401);
});

test('a write without a CSRF token is 403', { skip: !RUN }, async () => {
  const res = await fetch(`${base}/content/hero`, {
    method: 'PUT',
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ version: 0 }),
  });
  assert.equal(res.status, 403);
  assert.equal((await res.json()).error.code, 'CSRF');
});

// --- Hero singleton ---

test('GET hero returns the singleton with version + publishState', { skip: !RUN }, async () => {
  const { status, body } = await jsonReq('GET', '/content/hero');
  assert.equal(status, 200);
  assert.equal(typeof body.headline, 'string');
  assert.equal(typeof body.version, 'number');
  assert.ok('publishState' in body);
});

test('PUT hero validates, updates, bumps version, marks draft', { skip: !RUN }, async () => {
  const before = (await jsonReq('GET', '/content/hero')).body;
  const update = {
    version: before.version,
    headline: 'Tiêu đề mới',
    subheadline: 'Phụ đề mới',
    primaryCta: { label: 'Zalo', channel: 'zalo' },
  };
  const { status, body } = await jsonReq('PUT', '/content/hero', update);
  assert.equal(status, 200);
  assert.equal(body.headline, 'Tiêu đề mới');
  assert.equal(body.version, (before.version as number) + 1);
  assert.equal(body.publishState, 'draft');
});

test('PUT hero with a stale version is 409 with the current version', { skip: !RUN }, async () => {
  const { status, body } = await jsonReq('PUT', '/content/hero', {
    version: 0, // already bumped above
    headline: 'x',
    subheadline: 'y',
    primaryCta: { label: 'Zalo', channel: 'zalo' },
  });
  assert.equal(status, 409);
  assert.equal(body.error && (body.error as Record<string, unknown>).code, 'CONFLICT');
});

test('PUT hero with invalid content is 422', { skip: !RUN }, async () => {
  const current = (await jsonReq('GET', '/content/hero')).body;
  const { status, body } = await jsonReq('PUT', '/content/hero', {
    version: current.version,
    headline: '   ', // whitespace-only → invalid
    subheadline: 'ok',
    primaryCta: { label: 'Zalo', channel: 'zalo' },
  });
  assert.equal(status, 422);
  assert.equal((body.error as Record<string, unknown>).code, 'VALIDATION');
});

test('PUT hero is a full replace — an omitted optional field is cleared', { skip: !RUN }, async () => {
  // Seeded hero has a secondaryCta + media. Send an update WITHOUT them.
  const current = (await jsonReq('GET', '/content/hero')).body;
  const { status, body } = await jsonReq('PUT', '/content/hero', {
    version: current.version,
    headline: 'Chỉ có headline',
    subheadline: 'và subheadline',
    primaryCta: { label: 'Zalo', channel: 'zalo' },
  });
  assert.equal(status, 200);
  assert.ok(!('secondaryCta' in body), 'omitted secondaryCta is cleared on PUT');
  assert.ok(!('media' in body), 'omitted media is cleared on PUT');
});

// --- Seo singleton ---

test('GET + PUT seo works', { skip: !RUN }, async () => {
  const before = (await jsonReq('GET', '/content/seo')).body;
  assert.equal(typeof before.title, 'string');
  const { status, body } = await jsonReq('PUT', '/content/seo', {
    version: before.version,
    title: 'Tiêu đề SEO',
    description: 'Mô tả SEO',
  });
  assert.equal(status, 200);
  assert.equal(body.title, 'Tiêu đề SEO');
});

// --- Contact list ---

test('GET contact lists the seeded channels', { skip: !RUN }, async () => {
  const { status, body } = await jsonReq('GET', '/content/contact');
  assert.equal(status, 200);
  const list = body as unknown as Record<string, unknown>[];
  const types = list.map((c) => c.type);
  assert.ok(types.includes('zalo') && types.includes('kakao'));
});

test('POST contact rejects a duplicate channel type (INV-10) with 422', { skip: !RUN }, async () => {
  const { status, body } = await jsonReq('POST', '/content/contact', {
    type: 'zalo',
    label: 'Zalo 2',
    handle: '0911111111',
    icon: 'message-circle',
    external: true,
  });
  assert.equal(status, 422);
  assert.equal((body.error as Record<string, unknown>).code, 'VALIDATION');
});

test('POST contact creates a new channel type; DELETE removes it', { skip: !RUN }, async () => {
  const created = await jsonReq('POST', '/content/contact', {
    type: 'email',
    label: 'Email',
    handle: 'hi@vyvy.vn',
    icon: 'mail',
    external: false,
  });
  assert.equal(created.status, 201);
  const id = created.body.id as string;
  assert.ok(id);

  const del = await fetch(`${base}/content/contact/${id}?version=${created.body.version}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  assert.equal(del.status, 200);

  const list = (await jsonReq('GET', '/content/contact')).body as unknown as Record<string, unknown>[];
  assert.ok(!list.some((c) => c.id === id), 'deleted channel is gone');
});

test('PUT contact updates under optimistic concurrency (409 on stale)', { skip: !RUN }, async () => {
  const list = (await jsonReq('GET', '/content/contact')).body as unknown as Record<string, unknown>[];
  const phone = list.find((c) => c.type === 'phone')!;

  const ok = await jsonReq('PUT', `/content/contact/${phone.id}`, {
    version: phone.version,
    type: 'phone',
    label: 'Hotline mới',
    handle: '+84900000001',
    icon: 'phone',
    external: false,
  });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.label, 'Hotline mới');

  const stale = await jsonReq('PUT', `/content/contact/${phone.id}`, {
    version: phone.version, // now stale
    type: 'phone',
    label: 'x',
    handle: '+84900000002',
    icon: 'phone',
    external: false,
  });
  assert.equal(stale.status, 409);
});

test('POST contact/reorder validates the id set and reorders', { skip: !RUN }, async () => {
  const list = (await jsonReq('GET', '/content/contact')).body as unknown as Record<string, unknown>[];
  const ids = list.map((c) => c.id as string);
  const order = (await jsonReq('GET', '/content/contact/order')).body;

  const bad = await jsonReq('POST', '/content/contact/reorder', {
    orderedIds: ['nope'],
    orderVersion: order.version,
  });
  assert.equal(bad.status, 422);

  const missingVersion = await jsonReq('POST', '/content/contact/reorder', { orderedIds: ids });
  assert.equal(missingVersion.status, 422, 'orderVersion is required');

  const reversed = [...ids].reverse();
  const okRes = await jsonReq('POST', '/content/contact/reorder', {
    orderedIds: reversed,
    orderVersion: order.version,
  });
  assert.equal(okRes.status, 200);
  const after = okRes.body as unknown as Record<string, unknown>[];
  assert.deepEqual(after.map((c) => c.id), reversed);
});

test('a reorder with a stale orderVersion is 409', { skip: !RUN }, async () => {
  const order = (await jsonReq('GET', '/content/contact/order')).body;
  const ids = order.orderedIds as string[];
  const stale = await jsonReq('POST', '/content/contact/reorder', {
    orderedIds: [...ids].reverse(),
    orderVersion: (order.version as number) - 1,
  });
  assert.equal(stale.status, 409);
  assert.equal((stale.body.error as Record<string, unknown>).code, 'CONFLICT');
});

// --- Remediation r1: concurrency + API-handling hardening ---

test('concurrent creates of the same type cannot both succeed (unique index, P1)', { skip: !RUN }, async () => {
  const make = () =>
    jsonReq('POST', '/content/contact', {
      type: 'social',
      label: 'FB',
      handle: 'https://facebook.com/vyvy',
      icon: 'globe',
      external: true,
    });
  const results = await Promise.all([make(), make(), make(), make(), make()]);
  const created = results.filter((r) => r.status === 201).length;
  const rejected = results.filter((r) => r.status === 422).length;
  assert.equal(created, 1, 'exactly one social channel is created');
  assert.equal(rejected, 4, 'the rest are rejected 422');

  const list = (await jsonReq('GET', '/content/contact')).body as unknown as Record<string, unknown>[];
  assert.equal(list.filter((c) => c.type === 'social').length, 1, 'only one social channel exists');
});

test('a stale-write 409 reports the ACTUAL current version (fresh re-read, P2)', { skip: !RUN }, async () => {
  const current = (await jsonReq('GET', '/content/hero')).body;
  // Bump once so the stored version advances.
  await jsonReq('PUT', '/content/hero', {
    version: current.version,
    headline: 'v+1',
    subheadline: 's',
    primaryCta: { label: 'Zalo', channel: 'zalo' },
  });
  const nowVersion = (await jsonReq('GET', '/content/hero')).body.version;
  // A write with an old version → 409 whose currentVersion equals the live version.
  const conflict = await jsonReq('PUT', '/content/hero', {
    version: (nowVersion as number) - 1,
    headline: 'x',
    subheadline: 'y',
    primaryCta: { label: 'Zalo', channel: 'zalo' },
  });
  assert.equal(conflict.status, 409);
  const details = (conflict.body.error as Record<string, unknown>).details as { currentVersion: number };
  assert.equal(details.currentVersion, nowVersion);
});

test('concurrent reorders: exactly one commits, the rest get 409 (optimistic concurrency, P1)', { skip: !RUN }, async () => {
  const list = (await jsonReq('GET', '/content/contact')).body as unknown as Record<string, unknown>[];
  const ids = list.map((c) => c.id as string);
  assert.ok(ids.length >= 3, 'need >=3 channels to detect a blended order');

  const permA = [...ids].reverse();
  const permB = [ids[1], ids[2], ids[0], ...ids.slice(3)];

  for (let round = 0; round < 5; round++) {
    // All three requests race using the SAME orderVersion.
    const order = (await jsonReq('GET', '/content/contact/order')).body;
    const v = order.version as number;
    const results = await Promise.all([
      jsonReq('POST', '/content/contact/reorder', { orderedIds: permA, orderVersion: v }),
      jsonReq('POST', '/content/contact/reorder', { orderedIds: permB, orderVersion: v }),
      jsonReq('POST', '/content/contact/reorder', { orderedIds: permA, orderVersion: v }),
    ]);

    const committed = results.filter((r) => r.status === 200).length;
    const conflicted = results.filter((r) => r.status === 409).length;
    assert.equal(committed, 1, `round ${round}: exactly one reorder may commit`);
    assert.equal(conflicted, 2, `round ${round}: the losers must get 409`);

    const after = (await jsonReq('GET', '/content/contact')).body as unknown as Record<string, unknown>[];
    const finalIds = after.map((c) => c.id as string);

    // Every channel present exactly once — no lost/duplicated entries.
    assert.equal(finalIds.length, ids.length);
    assert.equal(new Set(finalIds).size, ids.length);
    // And the result is EXACTLY one of the submitted permutations, never a blend.
    const matchesA = JSON.stringify(finalIds) === JSON.stringify(permA);
    const matchesB = JSON.stringify(finalIds) === JSON.stringify(permB);
    assert.ok(matchesA || matchesB, `round ${round}: blended order ${finalIds.join(',')}`);
  }
});

test('concurrent reorders racing from the PRE-INITIALIZED ordering state (P2)', { skip: !RUN }, async () => {
  const list = (await jsonReq('GET', '/content/contact')).body as unknown as Record<string, unknown>[];
  const ids = list.map((c) => c.id as string);
  const permA = [...ids].reverse();
  const permB = [ids[1], ids[2], ids[0], ...ids.slice(3)];

  for (let round = 0; round < 5; round++) {
    // Reset to the state right after seeding: NO ContentOrder document at all, so
    // every racer starts from the not-yet-persisted version 0.
    await ContentOrder.deleteMany({}).exec();

    // Race reorders directly (no GET /order first) — they must materialize the record
    // and still resolve to exactly one winner.
    const results = await Promise.all([
      jsonReq('POST', '/content/contact/reorder', { orderedIds: permA, orderVersion: 0 }),
      jsonReq('POST', '/content/contact/reorder', { orderedIds: permB, orderVersion: 0 }),
      jsonReq('POST', '/content/contact/reorder', { orderedIds: permA, orderVersion: 0 }),
    ]);

    const committed = results.filter((r) => r.status === 200).length;
    const conflicted = results.filter((r) => r.status === 409).length;
    assert.equal(committed, 1, `round ${round}: exactly one reorder may commit from version 0`);
    assert.equal(conflicted, 2, `round ${round}: the losers must get 409`);

    const after = (await jsonReq('GET', '/content/contact')).body as unknown as Record<string, unknown>[];
    const finalIds = after.map((c) => c.id as string);
    assert.equal(new Set(finalIds).size, ids.length);
    const matches =
      JSON.stringify(finalIds) === JSON.stringify(permA) || JSON.stringify(finalIds) === JSON.stringify(permB);
    assert.ok(matches, `round ${round}: blended order ${finalIds.join(',')}`);
  }
});

test('creating a channel bumps orderVersion, invalidating a prepared reorder (P2)', { skip: !RUN }, async () => {
  await ContentOrder.deleteMany({}).exec();
  const before = (await jsonReq('GET', '/content/contact/order')).body;
  assert.equal(typeof before.version, 'number');

  // Create a channel AFTER reading the ordering handle.
  const created = await jsonReq('POST', '/content/contact', {
    type: 'email',
    label: 'Email',
    handle: 'race@vyvy.vn',
    icon: 'mail',
    external: false,
  });
  assert.equal(created.status, 201);

  const afterCreate = (await jsonReq('GET', '/content/contact/order')).body;
  assert.equal(
    afterCreate.version,
    (before.version as number) + 1,
    'create must bump the persisted ordering version',
  );

  // The reorder prepared against the old handle must now be rejected.
  const stale = await jsonReq('POST', '/content/contact/reorder', {
    orderedIds: before.orderedIds,
    orderVersion: before.version,
  });
  assert.equal(stale.status, 409, 'a reorder invalidated by create must report a version conflict');
  const details = (stale.body.error as Record<string, unknown>).details as {
    currentVersion: number;
  };
  assert.equal(details.currentVersion, afterCreate.version);

  // Cleanup so later assertions see a stable channel set.
  const list = (await jsonReq('GET', '/content/contact')).body as unknown as Record<string, unknown>[];
  const email = list.find((c) => c.type === 'email')!;
  await fetch(`${base}/content/contact/${email.id}?version=${email.version}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
});

test('a malformed contact id is 404, not a 500 CastError (API handling)', { skip: !RUN }, async () => {
  const put = await jsonReq('PUT', '/content/contact/not-an-objectid', {
    version: 0,
    type: 'zalo',
    label: 'x',
    handle: '0900000000',
    icon: 'i',
    external: true,
  });
  assert.equal(put.status, 404);

  const del = await fetch(`${base}/content/contact/not-an-objectid?version=0`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  assert.equal(del.status, 404);
});
