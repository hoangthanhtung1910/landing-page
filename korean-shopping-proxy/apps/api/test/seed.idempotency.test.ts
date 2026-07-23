import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { INestApplicationContext } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import type { Connection, Model } from 'mongoose';

/**
 * P1-01 verification: the normal seed is non-destructive and repeatable.
 * Gated behind RUN_MONGO_TESTS=1 (Codex sandbox denies localhost Mongo). Run with:
 *   RUN_MONGO_TESTS=1 MONGO_TEST_URI=mongodb://127.0.0.1:27017/vyvy_seedtest pnpm --filter api test
 */
const RUN = process.env.RUN_MONGO_TESTS === '1';

let app: INestApplicationContext | undefined;
let runSeed: typeof import('../src/seed/seed.core').runSeed;

before(async () => {
  if (!RUN) return;
  process.env.MONGO_URI =
    process.env.MONGO_TEST_URI ?? 'mongodb://127.0.0.1:27017/vyvy_seedtest';
  process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'test-secret';
  process.env.CORS_ORIGINS = process.env.CORS_ORIGINS ?? 'http://localhost:3000';

  const { NestFactory } = await import('@nestjs/core');
  const { AppModule } = await import('../src/app.module');
  ({ runSeed } = await import('../src/seed/seed.core'));
  app = await NestFactory.createApplicationContext(AppModule, { logger: false });
});

after(async () => {
  if (app) {
    const conn = app.get<Connection>(getConnectionToken());
    await conn.dropDatabase();
    await app.close();
  }
});

test('normal seed preserves admin data and does not duplicate seed records', { skip: !RUN }, async () => {
  const ctx = app!;
  const Service = ctx.get<Model<Record<string, unknown>>>(getModelToken('Service'));
  const PageRelease = ctx.get<Model<Record<string, unknown>>>(getModelToken('PageRelease'));
  const ContentOrder = ctx.get<Model<Record<string, unknown>>>(getModelToken('ContentOrder'));

  // Clean start.
  await runSeed(ctx, { forceReset: true });
  const seedCount1 = await Service.countDocuments({ seedKey: { $exists: true } });
  assert.equal(seedCount1, 3, 'expected 3 seeded services');

  // Admin creates a record with NO seedKey.
  await Service.create({
    title: 'ADMIN CREATED',
    description: 'must survive reseed',
    icon: 'star',
    publishState: 'published',
  });

  // Re-run the NORMAL (non-destructive) seed.
  const res = await runSeed(ctx, {});

  const seedCount2 = await Service.countDocuments({ seedKey: { $exists: true } });
  const adminSurvivors = await Service.countDocuments({ title: 'ADMIN CREATED' });
  const totalReleases = await PageRelease.countDocuments({});
  const orderDocs = await ContentOrder.countDocuments({});

  assert.equal(seedCount2, 3, 'seed records must not duplicate on rerun');
  assert.equal(adminSurvivors, 1, 'admin-created record must survive reseed');
  assert.equal(res.releaseCreated, false, 'existing release must be preserved (not recreated)');
  assert.equal(totalReleases, 1, 'no extra releases created on rerun');
  assert.equal(orderDocs, 7, 'seed creates one persisted ordering handle per list section');
});

test('normal seed never overwrites an existing content ordering handle', { skip: !RUN }, async () => {
  const ctx = app!;
  const ContentOrder = ctx.get<Model<Record<string, unknown>>>(getModelToken('ContentOrder'));

  await runSeed(ctx, { forceReset: true });
  const existing = (await ContentOrder.findById('services').lean().exec()) as {
    orderedIds?: string[];
    version?: number;
  } | null;
  assert.ok(existing);

  const reversed = [...(existing!.orderedIds ?? [])].reverse();
  await ContentOrder.updateOne(
    { _id: 'services' },
    { $set: { orderedIds: reversed, version: 7 } },
  ).exec();

  await runSeed(ctx, {});
  const after = (await ContentOrder.findById('services').lean().exec()) as {
    orderedIds?: string[];
    version?: number;
  } | null;
  assert.deepEqual(after?.orderedIds, reversed);
  assert.equal(after?.version, 7);
});

test('normal seed reuses legacy contact types instead of creating duplicates', { skip: !RUN }, async () => {
  const ctx = app!;
  const ContactChannel = ctx.get<Model<Record<string, unknown>>>(getModelToken('ContactChannel'));

  await ContactChannel.deleteMany({}).exec();
  await ContactChannel.create([
    { type: 'zalo', label: 'Zalo thật', handle: '0912345678', icon: 'message-circle', external: true, order: 1, publishState: 'published' },
    { type: 'kakao', label: 'Kakao thật', handle: 'real-kakao', icon: 'message-square', external: true, order: 2, publishState: 'published' },
    { type: 'messenger', label: 'Messenger thật', handle: 'vyvy.order', icon: 'message-circle-more', external: true, order: 3, publishState: 'published' },
    { type: 'phone', label: 'Hotline thật', handle: '+84912345678', icon: 'phone', external: false, order: 4, publishState: 'published' },
  ]);

  await runSeed(ctx, {});

  assert.equal(await ContactChannel.countDocuments({}), 4);
  assert.equal(await ContactChannel.countDocuments({ seedKey: { $exists: true } }), 0);
  const messenger = await ContactChannel.findOne({ type: 'messenger' }).lean().exec();
  assert.equal(messenger?.handle, 'vyvy.order', 'the real admin-owned handle must be preserved');
});

test('normal seed never resets admin security state (R2-P1-01)', { skip: !RUN }, async () => {
  const ctx = app!;
  const AdminUser = ctx.get<Model<Record<string, unknown>>>(getModelToken('AdminUser'));

  await runSeed(ctx, {});

  // Simulate a real password change + account disable by an operator.
  const CHANGED_HASH = '$2a$10$operator-changed-hash-value-000000000000000000000000';
  await AdminUser.updateOne(
    { username: 'admin' },
    { $set: { passwordHash: CHANGED_HASH, enabled: false } },
  ).exec();

  // Re-run the NORMAL seed.
  await runSeed(ctx, {});

  const admin = (await AdminUser.findOne({ username: 'admin' }).lean().exec()) as {
    passwordHash?: string;
    enabled?: boolean;
  } | null;

  assert.ok(admin, 'admin must exist');
  assert.equal(admin!.passwordHash, CHANGED_HASH, 'password hash must NOT be reset by seed');
  assert.equal(admin!.enabled, false, 'disabled state must NOT be re-enabled by seed');
});

test('admin edits to seed-owned content survive a normal seed rerun (insert-only)', { skip: !RUN }, async () => {
  const ctx = app!;
  const Service = ctx.get<Model<Record<string, unknown>>>(getModelToken('Service'));

  await runSeed(ctx, {});

  // Admin edits a SEEDED record directly.
  await Service.updateOne(
    { seedKey: 'service-1' },
    { $set: { title: 'ADMIN EDITED SEEDED TITLE' } },
  ).exec();

  // Re-run the NORMAL seed.
  await runSeed(ctx, {});

  const edited = (await Service.findOne({ seedKey: 'service-1' }).lean().exec()) as {
    title?: string;
  } | null;
  assert.equal(
    edited?.title,
    'ADMIN EDITED SEEDED TITLE',
    'seed must be insert-only: admin edits to seeded records are never overwritten',
  );
});
