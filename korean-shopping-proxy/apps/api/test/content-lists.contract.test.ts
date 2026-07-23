import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { INestApplication } from '@nestjs/common';

/**
 * T026d — contract coverage for services, trust-points and process-steps.
 * Uses a dedicated database and the full authenticated HTTP stack.
 */
const RUN = process.env.RUN_MONGO_TESTS === '1';
const ADMIN_PASS = 'list-content-test-admin-pass';

let app: INestApplication | undefined;
let base = '';
let cookie = '';
let csrf = '';

const authHeaders = (): Record<string, string> => ({
  cookie,
  'x-csrf-token': csrf,
  'content-type': 'application/json',
});

async function jsonReq(
  method: string,
  path: string,
  body?: unknown,
  authenticated = true,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: authenticated ? authHeaders() : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let parsed: Record<string, unknown> = {};
  try {
    parsed = (await res.json()) as Record<string, unknown>;
  } catch {
    // DELETE and unexpected empty responses.
  }
  return { status: res.status, body: parsed };
}

before(async () => {
  if (!RUN) return;
  process.env.MONGO_URI =
    process.env.MONGO_LIST_TEST_URI ?? 'mongodb://127.0.0.1:27017/vyvy_listcontenttest';
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

  const login = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: ADMIN_PASS }),
  });
  cookie = login.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
  csrf = ((await login.json()) as { csrfToken: string }).csrfToken;
});

after(async () => {
  if (!app) return;
  const { getConnectionToken } = await import('@nestjs/mongoose');
  const connection = app.get(getConnectionToken()) as { dropDatabase(): Promise<void> };
  await connection.dropDatabase();
  await app.close();
});

test('T026 routes require authentication and CSRF', { skip: !RUN }, async () => {
  assert.equal((await jsonReq('GET', '/content/services', undefined, false)).status, 401);
  assert.equal(
    (
      await fetch(`${base}/content/services`, {
        method: 'POST',
        headers: { cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'x', description: 'y', icon: 'star' }),
      })
    ).status,
    403,
  );
});

test('services CRUD validates input and rejects stale writes', { skip: !RUN }, async () => {
  const initial = await jsonReq('GET', '/content/services');
  assert.equal(initial.status, 200);
  assert.ok((initial.body as unknown as unknown[]).length >= 1);

  const invalid = await jsonReq('POST', '/content/services', {
    title: '   ',
    description: 'Mô tả',
    icon: 'star',
  });
  assert.equal(invalid.status, 422);

  const created = await jsonReq('POST', '/content/services', {
    title: 'Dịch vụ mới',
    description: 'Mô tả dịch vụ mới',
    icon: 'sparkles',
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.publishState, 'draft');
  assert.equal(created.body.version, 0);

  const id = created.body.id as string;
  const updated = await jsonReq('PUT', `/content/services/${id}`, {
    version: created.body.version,
    title: 'Dịch vụ đã sửa',
    description: 'Mô tả đã sửa',
    icon: 'badge-check',
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.version, 1);

  const stale = await jsonReq('PUT', `/content/services/${id}`, {
    version: 0,
    title: 'Ghi đè cũ',
    description: 'Không được lưu',
    icon: 'x',
  });
  assert.equal(stale.status, 409);
  assert.equal(
    ((stale.body.error as Record<string, unknown>).details as { currentVersion: number }).currentVersion,
    1,
  );

  const detail = await jsonReq('GET', `/content/services/${id}`);
  assert.equal(detail.status, 200);
  assert.equal(detail.body.title, 'Dịch vụ đã sửa');

  const removed = await jsonReq('DELETE', `/content/services/${id}?version=1`);
  assert.equal(removed.status, 200);
  assert.equal((await jsonReq('GET', `/content/services/${id}`)).status, 404);
});

test('trust-points supports create, full update and delete', { skip: !RUN }, async () => {
  const created = await jsonReq('POST', '/content/trust-points', {
    title: 'Uy tín',
    description: 'Minh bạch trong mọi giao dịch',
    icon: 'shield-check',
  });
  assert.equal(created.status, 201);

  const id = created.body.id as string;
  const updated = await jsonReq('PUT', `/content/trust-points/${id}`, {
    version: created.body.version,
    title: 'Uy tín lâu dài',
    description: 'Thông tin rõ ràng và hỗ trợ tận tâm',
    icon: 'heart-handshake',
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.publishState, 'draft');

  assert.equal(
    (await jsonReq('DELETE', `/content/trust-points/${id}?version=${updated.body.version}`)).status,
    200,
  );
});

test('process-steps update clears omitted optional icon', { skip: !RUN }, async () => {
  const created = await jsonReq('POST', '/content/process-steps', {
    title: 'Bước thử nghiệm',
    description: 'Có icon lúc tạo',
    icon: 'package',
  });
  assert.equal(created.status, 201);

  const updated = await jsonReq('PUT', `/content/process-steps/${created.body.id}`, {
    version: created.body.version,
    title: 'Bước thử nghiệm',
    description: 'Bỏ icon khi cập nhật',
  });
  assert.equal(updated.status, 200);
  assert.ok(!('icon' in updated.body));
});

test('process-steps reorder is atomic and version checked', { skip: !RUN }, async () => {
  const order = await jsonReq('GET', '/content/process-steps/order');
  assert.equal(order.status, 200);
  const ids = order.body.orderedIds as string[];
  assert.ok(ids.length >= 3);

  const reversed = [...ids].reverse();
  const rotated = [...ids.slice(1), ids[0]];
  const version = order.body.version as number;
  const results = await Promise.all([
    jsonReq('POST', '/content/process-steps/reorder', {
      orderedIds: reversed,
      orderVersion: version,
    }),
    jsonReq('POST', '/content/process-steps/reorder', {
      orderedIds: rotated,
      orderVersion: version,
    }),
  ]);
  assert.equal(results.filter((result) => result.status === 200).length, 1);
  assert.equal(results.filter((result) => result.status === 409).length, 1);

  const finalList = (await jsonReq('GET', '/content/process-steps')).body as unknown as Array<{
    id: string;
  }>;
  const finalIds = finalList.map((item) => item.id);
  assert.ok(
    JSON.stringify(finalIds) === JSON.stringify(reversed) ||
      JSON.stringify(finalIds) === JSON.stringify(rotated),
  );
});

test('malformed T026 item ids return 404 instead of 500', { skip: !RUN }, async () => {
  assert.equal((await jsonReq('GET', '/content/services/not-an-objectid')).status, 404);
  assert.equal(
    (
      await jsonReq('PUT', '/content/trust-points/not-an-objectid', {
        version: 0,
        title: 'x',
        description: 'y',
        icon: 'z',
      })
    ).status,
    404,
  );
});
