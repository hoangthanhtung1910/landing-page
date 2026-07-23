import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SiteContentBody } from '@vyvy/content-types';
import { normalizeLegacySeedMedia } from '../src/releases/legacy-seed-media';

const requiredContent = {
  brand: {
    name: 'VyVy',
    slogan: 'Slogan',
    logo: {
      src: 'http://localhost:4000/media/seed/logo.png',
      alt: 'Logo',
    },
  },
  hero: {
    headline: 'Headline',
    subheadline: 'Subheadline',
    primaryCta: { label: 'Zalo', channel: 'zalo' as const },
    media: {
      src: 'http://localhost:4000/media/seed/hero.png',
      alt: 'Hero',
    },
  },
  cta: {
    headline: 'CTA',
    channels: [
      { label: 'Zalo', channel: 'zalo' as const },
      { label: 'Kakao', channel: 'kakao' as const },
    ],
  },
  footer: { contactSummary: 'Contact', copyright: 'Copyright' },
  contact: [
    { type: 'zalo' as const, label: 'Zalo', handle: '0900000000', icon: 'message', external: true },
    { type: 'kakao' as const, label: 'Kakao', handle: 'vyvy', icon: 'message', external: true },
  ],
  seo: { title: 'Title', description: 'Description' },
} satisfies SiteContentBody;

test('maps only known legacy seed URLs to bundled web assets', () => {
  const normalized = normalizeLegacySeedMedia({
    ...requiredContent,
    categories: [{
      id: '1',
      name: 'Mỹ phẩm',
      image: {
        src: 'http://localhost:4000/media/seed/cat-beauty.png',
        alt: 'Beauty',
      },
    }],
  });

  assert.equal(normalized.brand.logo?.src, '/placeholder-logo.png');
  assert.equal(normalized.hero.media?.src, '/images/hero-shopping.png');
  assert.equal(normalized.categories?.[0].image.src, '/images/cat-beauty.png');
});

test('leaves uploaded and unknown media URLs unchanged', () => {
  const uploaded = 'http://localhost:4000/media/files/asset.png';
  const unknownSeed = 'http://localhost:4000/media/seed/custom.png';
  const normalized = normalizeLegacySeedMedia({
    ...requiredContent,
    hero: {
      ...requiredContent.hero,
      media: { src: uploaded, alt: 'Uploaded' },
    },
    seo: {
      ...requiredContent.seo,
      ogImage: { src: unknownSeed, alt: 'Custom' },
    },
  });

  assert.equal(normalized.hero.media?.src, uploaded);
  assert.equal(normalized.seo.ogImage?.src, unknownSeed);
});
