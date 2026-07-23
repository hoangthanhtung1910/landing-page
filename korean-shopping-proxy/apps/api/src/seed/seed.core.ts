import type { INestApplicationContext } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { DEFAULT_SECTION_VISIBILITY } from '../releases/release.schemas';
import { buildSeed } from './seed.data';
import { assembleReleaseContent, type SeedIds } from './assemble';

const UNSAFE_DEFAULT_PASSWORDS = new Set(['change-me', 'change-me-immediately']);

export interface SeedOptions {
  /** Full destructive reset of seed-owned + release/state records. Dev only. */
  forceReset?: boolean;
}

export interface SeedResult {
  releaseNumber: number | null;
  releaseCreated: boolean;
  counts: Record<string, number>;
  reviewsApprovedPublic: number;
  adminUsername: string;
}

const LIST_COLLECTIONS = [
  'Service',
  'TrustPoint',
  'ProcessStep',
  'Category',
  'Review',
  'Faq',
  'ContactChannel',
] as const;

const SINGLETON_COLLECTIONS = ['Brand', 'Hero', 'Cta', 'Footer', 'Seo'] as const;

const ORDER_KEYS: Record<(typeof LIST_COLLECTIONS)[number], string> = {
  Service: 'services',
  TrustPoint: 'trust-points',
  ProcessStep: 'process-steps',
  Category: 'categories',
  Review: 'reviews',
  Faq: 'faq',
  ContactChannel: 'contact',
};

/**
 * Non-destructive, idempotent seed (P1-01, hardened per R2-P1-01).
 *
 * INSERT-ONLY semantics: every seed write uses `$setOnInsert` — a record is
 * created only if absent and NEVER modified afterwards. Therefore:
 *  - admin-created content (no seedKey) is never touched,
 *  - administrator edits made to seed-owned records are never overwritten,
 *  - the existing administrator's password hash and enabled state are never
 *    changed by a normal seed run (password reset / reactivation are explicit
 *    admin workflows, not seed side effects).
 * The initial release + pointer are created ONLY when nothing is published yet,
 * so rerunning after an admin publish preserves release history. `forceReset`
 * (dev only, refused in production) wipes seed-owned + release/state and rebuilds.
 */
export async function runSeed(
  app: INestApplicationContext,
  options: SeedOptions = {},
): Promise<SeedResult> {
  const config = app.get(ConfigService);
  const isProd = (config.get<string>('NODE_ENV') ?? process.env.NODE_ENV) === 'production';

  if (options.forceReset && isProd) {
    throw new Error('Refusing forceReset in production.');
  }

  const model = (name: string): Model<Record<string, unknown>> =>
    app.get<Model<Record<string, unknown>>>(getModelToken(name));

  const mediaBase =
    config.get<string>('MEDIA_PUBLIC_BASE_URL') ?? 'http://localhost:4000/media/files';
  const data = buildSeed(mediaBase);

  if (options.forceReset) {
    for (const c of [...SINGLETON_COLLECTIONS, ...LIST_COLLECTIONS]) {
      await model(c).deleteMany({ seedKey: { $exists: true } }).exec();
    }
    await model('PageRelease').deleteMany({}).exec();
    await model('SiteState').deleteMany({}).exec();
    await model('ContentOrder').deleteMany({}).exec();
  }

  const counts: Record<string, number> = {};

  // Insert-only singletons by fixed seedKey ($setOnInsert: never modify existing).
  const singletons: Record<string, Record<string, unknown>> = {
    Brand: data.brand,
    Hero: data.hero,
    Cta: data.cta,
    Footer: data.footer,
    Seo: data.seo,
  };
  for (const [name, doc] of Object.entries(singletons)) {
    const seedKey = name.toLowerCase();
    await model(name)
      .findOneAndUpdate(
        { seedKey },
        { $setOnInsert: { ...doc, seedKey, publishState: 'published' } },
        { upsert: true, new: true },
      )
      .exec();
    counts[name] = 1;
  }

  // Insert-only list items by stable per-item seedKey; collect ids in order.
  const listData: Record<string, Array<Record<string, unknown>>> = {
    Service: data.services,
    TrustPoint: data.trustPoints,
    ProcessStep: data.processSteps,
    Category: data.categories,
    Review: data.reviews,
    Faq: data.faq,
    ContactChannel: data.contactChannels,
  };
  const idsByCollection: Record<string, string[]> = {};
  for (const [name, items] of Object.entries(listData)) {
    const ids: string[] = [];
    for (let i = 0; i < items.length; i++) {
      const seedKey = `${name.toLowerCase()}-${i + 1}`;
      // Legacy contact records predate seedKey but already have the stable
      // identity (`type`) used by CTA references. Reuse those records instead of
      // inserting a second Zalo/Kakao/etc. record. Do not claim them by adding a
      // seedKey: they remain admin-owned and survive force-reset.
      const legacyContact =
        name === 'ContactChannel' && typeof items[i].type === 'string'
          ? await model(name).findOne({ type: items[i].type }).exec()
          : null;
      const doc =
        legacyContact ??
        await model(name)
          .findOneAndUpdate(
            { seedKey },
            { $setOnInsert: { ...items[i], seedKey, publishState: 'published' } },
            { upsert: true, new: true },
          )
          .exec();
      ids.push(String((doc as { _id: unknown })._id));
    }
    idsByCollection[name] = ids;
    counts[name] = items.length;
  }

  // Persist one ordering handle per list before the admin API can mutate it.
  // This is insert-only: normal seed reruns never overwrite an administrator's
  // chosen ordering or its optimistic-concurrency version. Querying the complete
  // collection also initializes legacy databases that contain admin-created rows.
  for (const name of LIST_COLLECTIONS) {
    const docs = (await model(name)
      .find()
      .sort({ order: 1, _id: 1 })
      .select({ _id: 1 })
      .lean()
      .exec()) as Array<{ _id: unknown }>;
    await model('ContentOrder')
      .findOneAndUpdate(
        { _id: ORDER_KEYS[name] },
        {
          $setOnInsert: {
            orderedIds: docs.map((doc) => String(doc._id)),
            version: 0,
          },
        },
        { upsert: true, new: true },
      )
      .exec();
  }

  const seedIds: SeedIds = {
    services: idsByCollection.Service,
    trustPoints: idsByCollection.TrustPoint,
    processSteps: idsByCollection.ProcessStep,
    categories: idsByCollection.Category,
    reviews: idsByCollection.Review,
    faq: idsByCollection.Faq,
  };

  // Initial admin: CREATE-IF-ABSENT ONLY (R2-P1-01). A normal seed run must never
  // change an existing administrator's password hash or enabled state — password
  // reset/rotation and reactivation are explicit admin workflows, not seed effects.
  const username = config.get<string>('SEED_ADMIN_USERNAME') ?? 'admin';
  const password = config.get<string>('SEED_ADMIN_PASSWORD') ?? 'change-me';
  if (isProd && UNSAFE_DEFAULT_PASSWORDS.has(password)) {
    throw new Error('Refusing to seed an admin with a default password in production.');
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await model('AdminUser')
    .updateOne(
      { username },
      { $setOnInsert: { username, passwordHash, enabled: true } },
      { upsert: true },
    )
    .exec();

  // Release + pointer: only when nothing is published yet (preserve admin history).
  const state = await model('SiteState').findOne({}).exec();
  const hasCurrent = !!(state as { currentReleaseId?: unknown } | null)?.currentReleaseId;

  let releaseNumber: number | null = null;
  let releaseCreated = false;
  const content = assembleReleaseContent(data, seedIds);

  if (!hasCurrent) {
    const release = await model('PageRelease').create({
      releaseNumber: 1,
      sectionVisibility: { ...DEFAULT_SECTION_VISIBILITY },
      content,
      publishedAt: new Date(),
    });
    releaseNumber = 1;
    releaseCreated = true;
    if (state) {
      await model('SiteState')
        .updateOne(
          { _id: (state as { _id: unknown })._id },
          { $set: { currentReleaseId: (release as { _id: unknown })._id } },
        )
        .exec();
    } else {
      await model('SiteState').create({
        key: 'singleton',
        currentReleaseId: (release as { _id: unknown })._id,
        previousReleaseId: null,
        sectionVisibilityDraft: { ...DEFAULT_SECTION_VISIBILITY },
        version: 0,
        releaseSequence: 1,
      });
    }
  } else {
    const currentId = (state as unknown as { currentReleaseId: unknown })
      .currentReleaseId;
    releaseNumber =
      (
        (await model('PageRelease')
          .findById(currentId)
          .lean()
          .exec()) as { releaseNumber?: number } | null
      )?.releaseNumber ?? null;
  }

  const reviewsApprovedPublic = (content.reviews ?? []).length;

  return {
    releaseNumber,
    releaseCreated,
    counts,
    reviewsApprovedPublic,
    adminUsername: username,
  };
}
