import { test } from 'node:test';
import assert from 'node:assert/strict';
import { siteContentSchema } from '@vyvy/content-types';
import { buildSeed } from '../src/seed/seed.data';
import { assembleReleaseContent, type SeedIds } from '../src/seed/assemble';

function syntheticIds(data: ReturnType<typeof buildSeed>): SeedIds {
  const ids = (prefix: string, n: number) =>
    Array.from({ length: n }, (_, i) => `${prefix}${i + 1}`);
  return {
    services: ids('svc', data.services.length),
    trustPoints: ids('tp', data.trustPoints.length),
    processSteps: ids('ps', data.processSteps.length),
    categories: ids('cat', data.categories.length),
    reviews: ids('rev', data.reviews.length),
    faq: ids('faq', data.faq.length),
  };
}

test('assembled seed content matches the public SiteContent schema', () => {
  const data = buildSeed('http://localhost:4000/media');
  const body = assembleReleaseContent(data, syntheticIds(data));
  const full = { ...body, meta: { releaseNumber: 1, publishedAt: new Date().toISOString() } };
  const result = siteContentSchema.safeParse(full);
  assert.equal(result.success, true, JSON.stringify(result.error?.issues, null, 2));
});

test('order is PRESERVED for processSteps and faq (P1-03)', () => {
  const data = buildSeed('http://localhost:4000/media');
  const body = assembleReleaseContent(data, syntheticIds(data));
  assert.ok(body.processSteps && body.processSteps.length > 0);
  for (const step of body.processSteps!) {
    assert.equal(typeof step.order, 'number');
  }
  assert.ok(body.faq && body.faq.length > 0);
  for (const f of body.faq!) {
    assert.equal(typeof f.order, 'number');
  }
});

test('reviews expose no moderation fields and require approval plus consent (P2-03/FR-043)', () => {
  const data = buildSeed('http://localhost:4000/media');
  data.reviews[0].approved = true;
  data.reviews[0].consentGiven = false;
  data.reviews[1].approved = true;
  data.reviews[1].consentGiven = true;
  const body = assembleReleaseContent(data, syntheticIds(data));
  assert.equal(body.reviews?.length, 1);
  assert.equal(body.reviews?.[0].name, '[Seed] Khách hàng mẫu B');
  for (const r of body.reviews ?? []) {
    assert.ok(!('approved' in r));
    assert.ok(!('consentGiven' in r));
  }
});

test('list items whose public type omits order do not carry it', () => {
  const data = buildSeed('http://localhost:4000/media');
  const body = assembleReleaseContent(data, syntheticIds(data));
  for (const s of body.services ?? []) assert.ok(!('order' in s) && !('publishState' in s));
  for (const c of body.categories ?? []) assert.ok(!('order' in c) && !('publishState' in c));
  for (const c of body.contact) assert.ok(!('publishState' in c) && !('seedKey' in c));
});

test('strict schema FAILS (not strips) on leaked nested admin fields (R2-P2-01)', () => {
  const data = buildSeed('http://localhost:4000/media');
  const body = assembleReleaseContent(data, syntheticIds(data));
  const meta = { releaseNumber: 1, publishedAt: new Date().toISOString() };

  const leak1 = JSON.parse(JSON.stringify({ ...body, meta }));
  leak1.hero.publishState = 'draft';
  assert.equal(siteContentSchema.safeParse(leak1).success, false, 'hero.publishState must fail');

  const leak2 = JSON.parse(JSON.stringify({ ...body, meta }));
  leak2.contact[0].approved = true;
  assert.equal(siteContentSchema.safeParse(leak2).success, false, 'contact[].approved must fail');

  const leak3 = JSON.parse(JSON.stringify({ ...body, meta }));
  leak3.services[0].seedKey = 'service-1';
  assert.equal(siteContentSchema.safeParse(leak3).success, false, 'services[].seedKey must fail');

  const leak4 = JSON.parse(JSON.stringify({ ...body, meta }));
  leak4.faq[0].version = 3;
  assert.equal(siteContentSchema.safeParse(leak4).success, false, 'faq[].version must fail');
});
