import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSeed } from '../src/seed/seed.data';
import { assembleReleaseContent } from '../src/seed/assemble';
test('CMS seed contains the full migrated landing-page structure with no fabricated public reviews', () => {
  const seed = buildSeed('http://localhost:4000/media/files');
  const ids = (prefix: string, count: number) => Array.from({ length: count }, (_, index) => `${prefix}-${index}`);
  const content = assembleReleaseContent(seed, { services: ids('s',seed.services.length), trustPoints:ids('t',seed.trustPoints.length), processSteps:ids('p',seed.processSteps.length), categories:ids('c',seed.categories.length), reviews:ids('r',seed.reviews.length), faq:ids('f',seed.faq.length) });
  assert.equal(content.brand.name, 'VyVy Order Korea');
  assert.ok((content.services?.length ?? 0) > 0);
  assert.ok((content.trustPoints?.length ?? 0) >= 3);
  assert.equal(content.processSteps?.length, 6);
  assert.ok(content.categories?.some((item) => /K-pop/i.test(item.name)));
  assert.deepEqual(content.reviews, []);
  assert.ok((content.faq?.length ?? 0) > 0);
});
