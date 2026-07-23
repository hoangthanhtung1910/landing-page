import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { INestApplication } from '@nestjs/common';

/** T027d — categories, reviews and FAQ admin contract tests. */
const RUN = process.env.RUN_MONGO_TESTS === '1';
const ADMIN_PASS = 'editorial-content-test-pass';

let app: INestApplication | undefined;
let base = '';
let cookie = '';
let csrf = '';

const headers = (): Record<string, string> => ({
  cookie,
  'x-csrf-token': csrf,
  'content-type': 'application/json',
});

async function request(
  method: string,
  path: string,
  body?: unknown,
  authenticated = true,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: authenticated ? headers() : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let parsed: Record<string, unknown> = {};
  try {
    parsed = (await response.json()) as Record<string, unknown>;
  } catch {
    // Empty response.
  }
  return { status: response.status, body: parsed };
}

before(async () => {
  if (!RUN) return;
  process.env.MONGO_URI =
    process.env.MONGO_EDITORIAL_TEST_URI ?? 'mongodb://127.0.0.1:27017/vyvy_editorialtest';
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

test('T027 routes enforce authentication and CSRF', { skip: !RUN }, async () => {
  assert.equal((await request('GET', '/content/categories', undefined, false)).status, 401);
  const noCsrf = await fetch(`${base}/content/faq`, {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ question: 'Câu hỏi?', answer: 'Câu trả lời.' }),
  });
  assert.equal(noCsrf.status, 403);
});

test('categories validate images and clear an omitted blurb on update', { skip: !RUN }, async () => {
  const invalid = await request('POST', '/content/categories', {
    name: 'Danh mục lỗi',
    image: { src: 'javascript:alert(1)', alt: '' },
  });
  assert.equal(invalid.status, 422);

  const created = await request('POST', '/content/categories', {
    name: 'Phụ kiện',
    image: { src: '/images/cat-accessories.png', alt: 'Phụ kiện Hàn Quốc' },
    blurb: 'Phụ kiện theo xu hướng mới',
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.publishState, 'draft');

  const updated = await request('PUT', `/content/categories/${created.body.id}`, {
    version: created.body.version,
    name: 'Phụ kiện Hàn Quốc',
    image: { src: '/images/cat-accessories.png', alt: 'Phụ kiện chính hãng' },
  });
  assert.equal(updated.status, 200);
  assert.ok(!('blurb' in updated.body), 'PUT clears an omitted optional blurb');
});

test('reviews require consent before approval and retain admin-only flags', { skip: !RUN }, async () => {
  const invalidApproval = await request('POST', '/content/reviews', {
    name: 'Khách hàng thật',
    text: 'Dịch vụ rất tốt.',
    rating: 5,
    approved: true,
    consentGiven: false,
  });
  assert.equal(invalidApproval.status, 422);

  const invalidRating = await request('POST', '/content/reviews', {
    name: 'Khách hàng thật',
    text: 'Đánh giá không hợp lệ.',
    rating: 6,
    approved: false,
    consentGiven: false,
  });
  assert.equal(invalidRating.status, 422);

  const created = await request('POST', '/content/reviews', {
    name: 'Nguyễn An',
    text: 'Tư vấn nhanh và đóng gói cẩn thận.',
    rating: 5,
    location: 'Đà Nẵng',
    approved: false,
    consentGiven: false,
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.approved, false);
  assert.equal(created.body.consentGiven, false);

  const approved = await request('PUT', `/content/reviews/${created.body.id}`, {
    version: created.body.version,
    name: 'Nguyễn An',
    text: 'Tư vấn nhanh và đóng gói cẩn thận.',
    rating: 5,
    location: 'Đà Nẵng',
    approved: true,
    consentGiven: true,
  });
  assert.equal(approved.status, 200);
  assert.equal(approved.body.approved, true);
  assert.equal(approved.body.consentGiven, true);
});

test('review moderation fields never leak through the current public release', { skip: !RUN }, async () => {
  const publicResponse = await fetch(`${base}/public/content`);
  assert.equal(publicResponse.status, 200);
  const content = (await publicResponse.json()) as { reviews?: Array<Record<string, unknown>> };
  for (const review of content.reviews ?? []) {
    assert.ok(!('approved' in review));
    assert.ok(!('consentGiven' in review));
  }
});

test('FAQ CRUD and concurrent reorder use optimistic concurrency', { skip: !RUN }, async () => {
  const created = await request('POST', '/content/faq', {
    question: 'Có nhận mua hàng giới hạn không?',
    answer: 'Có, vui lòng gửi link để được kiểm tra trước.',
  });
  assert.equal(created.status, 201);

  const updated = await request('PUT', `/content/faq/${created.body.id}`, {
    version: created.body.version,
    question: 'Có nhận mua sản phẩm giới hạn không?',
    answer: 'Có, vui lòng gửi link để được kiểm tra trước.',
  });
  assert.equal(updated.status, 200);

  const order = await request('GET', '/content/faq/order');
  const ids = order.body.orderedIds as string[];
  const reversed = [...ids].reverse();
  const rotated = [...ids.slice(1), ids[0]];
  const version = order.body.version as number;
  const results = await Promise.all([
    request('POST', '/content/faq/reorder', { orderedIds: reversed, orderVersion: version }),
    request('POST', '/content/faq/reorder', { orderedIds: rotated, orderVersion: version }),
  ]);
  assert.equal(results.filter((result) => result.status === 200).length, 1);
  assert.equal(results.filter((result) => result.status === 409).length, 1);

  const current = await request('GET', `/content/faq/${created.body.id}`);
  assert.equal(current.body.question, 'Có nhận mua sản phẩm giới hạn không?');
  assert.equal(
    (await request('DELETE', `/content/faq/${created.body.id}?version=${current.body.version}`)).status,
    200,
  );
});

test('malformed T027 item ids return 404', { skip: !RUN }, async () => {
  assert.equal((await request('GET', '/content/reviews/not-an-objectid')).status, 404);
  assert.equal(
    (
      await request('PUT', '/content/categories/not-an-objectid', {
        version: 0,
        name: 'x',
        image: { src: '/x.png', alt: 'x' },
      })
    ).status,
    404,
  );
});
