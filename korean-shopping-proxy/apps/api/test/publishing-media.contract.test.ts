import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import type { Model } from 'mongoose';

const RUN = process.env.RUN_MONGO_TESTS === '1';
const ADMIN_PASS = 'publishing-media-test-pass';
let app: INestApplication | undefined;
let base = '';
let cookie = '';
let csrf = '';
let uploadedAsset: Record<string, unknown> = {};

const authHeaders = (): Record<string, string> => ({
  cookie,
  'x-csrf-token': csrf,
  'content-type': 'application/json',
});

async function json(
  method: string,
  path: string,
  body?: unknown,
  authenticated = true,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: authenticated ? authHeaders() : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let parsed: Record<string, unknown> = {};
  try { parsed = (await response.json()) as Record<string, unknown>; } catch { /* empty */ }
  return { status: response.status, body: parsed };
}

before(async () => {
  if (!RUN) return;
  process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/vyvy_publishmediatest';
  process.env.SESSION_SECRET = 'test-session-secret-value';
  process.env.CORS_ORIGINS = 'http://localhost:3000';
  process.env.SEED_ADMIN_PASSWORD = ADMIN_PASS;
  process.env.STORAGE_LOCAL_DIR = '/tmp/vyvy-publishing-media-test';
  process.env.MEDIA_PUBLIC_BASE_URL = 'http://localhost:4000/media/files';
  delete process.env.WEB_REVALIDATE_URL;
  delete process.env.REVALIDATE_SECRET;

  const { NestFactory } = await import('@nestjs/core');
  const { ValidationPipe } = await import('@nestjs/common');
  const { AppModule } = await import('../src/app.module');
  const { AllExceptionsFilter } = await import('../src/common/http-exception.filter');
  const { runSeed } = await import('../src/seed/seed.core');
  app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
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

test('media mutation and publish routes require auth/CSRF', { skip: !RUN }, async () => {
  assert.equal((await json('GET', '/media', undefined, false)).status, 401);
  assert.equal((await json('POST', '/publish', {}, false)).status, 401);
  assert.equal((await json('POST', '/revalidate', {}, false)).status, 401);
  const response = await fetch(`${base}/publish`, { method: 'POST', headers: { cookie } });
  assert.equal(response.status, 403);
  const revalidate = await fetch(`${base}/revalidate`, { method: 'POST', headers: { cookie } });
  assert.equal(revalidate.status, 403);
});

test('media upload content-inspects MIME and returns a public stable URL', { skip: !RUN }, async () => {
  const bad = new FormData();
  bad.set('alt', 'Tệp giả');
  bad.set('file', new Blob(['not-an-image'], { type: 'image/png' }), 'fake.png');
  const rejected = await fetch(`${base}/media`, {
    method: 'POST', headers: { cookie, 'x-csrf-token': csrf }, body: bad,
  });
  assert.equal(rejected.status, 422);

  const oversized = new FormData();
  oversized.set('alt', 'Tệp quá lớn');
  oversized.set(
    'file',
    new Blob([Buffer.alloc(5_242_881)], { type: 'image/png' }),
    'oversized.png',
  );
  const oversizedResponse = await fetch(`${base}/media`, {
    method: 'POST', headers: { cookie, 'x-csrf-token': csrf }, body: oversized,
  });
  assert.ok(
    oversizedResponse.status === 413 || oversizedResponse.status === 422,
    `expected oversized upload rejection, got ${oversizedResponse.status}`,
  );

  // 1x1 transparent PNG.
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  );
  const form = new FormData();
  form.set('alt', 'Ảnh kiểm thử');
  form.set('file', new Blob([png], { type: 'image/png' }), 'pixel.png');
  const uploaded = await fetch(`${base}/media`, {
    method: 'POST', headers: { cookie, 'x-csrf-token': csrf }, body: form,
  });
  assert.equal(uploaded.status, 201);
  const asset = (await uploaded.json()) as Record<string, unknown>;
  uploadedAsset = asset;
  assert.match(String(asset.url), /\/media\/files\//);
  assert.equal(asset.width, 1);
  assert.equal(asset.height, 1);
  const publicFile = await fetch(String(asset.url).replace('http://localhost:4000', base));
  assert.equal(publicFile.status, 200);
});

test('publish backfills counters missing from a legacy SiteState', { skip: !RUN }, async () => {
  const states = app!.get<Model<Record<string, unknown>>>(getModelToken('SiteState'));
  await states.updateOne({}, { $unset: { releaseSequence: 1, version: 1 } }).exec();

  const published = await json('POST', '/publish', {});
  assert.equal(published.status, 201, JSON.stringify(published.body));
  assert.equal(published.body.releaseNumber, 2);

  const repaired = await states.findOne().lean<{ releaseSequence: number; version: number }>().exec();
  assert.equal(repaired?.releaseSequence, 2);
  assert.equal(repaired?.version, 1);
});

test('section visibility rejects required keys and remains draft until publish', { skip: !RUN }, async () => {
  const visibility = await json('GET', '/sections/visibility');
  assert.equal((await json('PUT', '/sections/visibility', { version: visibility.body.version, hero: false })).status, 422);
  const updated = await json('PUT', '/sections/visibility', { version: visibility.body.version, faq: false, reviews: true });
  assert.equal(updated.status, 200);
  assert.equal((updated.body.visibility as Record<string, boolean>).faq, false);

  const before = await fetch(`${base}/public/content`).then((response) => response.json()) as Record<string, unknown>;
  assert.ok('faq' in before, 'visibility changes are drafts until publish');
});

test('publish advances one atomic release; invalid candidates leave the prior release live', { skip: !RUN }, async () => {
  const before = await fetch(`${base}/public/content`).then((response) => response.json()) as { meta: { releaseNumber: number } };
  const heroDraft = await json('GET', '/content/hero');
  const currentMedia = heroDraft.body.media as Record<string, unknown> | undefined;
  const heroUpdate = await json('PUT', '/content/hero', {
    version: heroDraft.body.version,
    headline: heroDraft.body.headline,
    subheadline: heroDraft.body.subheadline,
    primaryCta: heroDraft.body.primaryCta,
    secondaryCta: heroDraft.body.secondaryCta,
    media: {
      src: uploadedAsset.url,
      alt: uploadedAsset.alt,
      width: uploadedAsset.width,
      height: uploadedAsset.height,
    },
  });
  assert.equal(heroUpdate.status, 200, JSON.stringify({ currentMedia, response: heroUpdate.body }));
  const published = await json('POST', '/publish', {});
  assert.equal(published.status, 201);
  const after = await fetch(`${base}/public/content`).then((response) => response.json()) as Record<string, unknown> & { meta: { releaseNumber: number } };
  assert.equal(after.meta.releaseNumber, before.meta.releaseNumber + 1);
  assert.ok(!('faq' in after));
  assert.deepEqual(after.reviews, []);
  assert.equal((await json('DELETE', `/media/${uploadedAsset.id}`)).status, 409);

  const hero = await json('GET', '/content/hero');
  await json('PUT', '/content/hero', {
    version: hero.body.version,
    headline: '',
    subheadline: 'Không hợp lệ',
    primaryCta: { label: 'Zalo', channel: 'zalo' },
  });
  // Invalid writes are rejected before storage, so force an invalid candidate through a valid
  // cross-section state: delete Kakao then publishing must fail CTA-reference validation.
  const contacts = await json('GET', '/content/contact');
  const kakao = (contacts.body as unknown as Array<Record<string, unknown>>).find((item) => item.type === 'kakao');
  assert.ok(kakao);
  await json('DELETE', `/content/contact/${kakao.id}?version=${kakao.version}`);
  const failed = await json('POST', '/publish', {});
  assert.equal(failed.status, 422);
  const stillLive = await fetch(`${base}/public/content`).then((response) => response.json()) as { meta: { releaseNumber: number } };
  assert.equal(stillLive.meta.releaseNumber, after.meta.releaseNumber);
});

test('rollback restores the previous release and actions are audited', { skip: !RUN }, async () => {
  const current = await json('GET', '/releases/current');
  const currentNumber = current.body.releaseNumber as number;
  const rollback = await json('POST', '/rollback', {});
  assert.equal(rollback.status, 201);
  assert.equal(rollback.body.releaseNumber, currentNumber - 1);
  const events = await json('GET', '/audit');
  const actions = (events.body.items as Array<Record<string, unknown>>).map((event) => event.action);
  assert.ok(actions.includes('publish'));
  assert.ok(actions.includes('rollback'));
  assert.ok(actions.includes('toggleSection'));
  assert.ok(actions.includes('mediaUpload'));
});

test('current release can be revalidated without creating another release', { skip: !RUN }, async () => {
  const before = await json('GET', '/releases/current');
  const retried = await json('POST', '/revalidate', {});
  assert.equal(retried.status, 201);
  assert.equal(retried.body.releaseNumber, before.body.releaseNumber);
  assert.ok(
    ['skipped', 'succeeded'].includes(
      String((retried.body.revalidation as Record<string, unknown>).status),
    ),
  );
  const after = await json('GET', '/releases/current');
  assert.equal(after.body.releaseNumber, before.body.releaseNumber);
  assert.deepEqual(after.body.revalidation, retried.body.revalidation);
});
