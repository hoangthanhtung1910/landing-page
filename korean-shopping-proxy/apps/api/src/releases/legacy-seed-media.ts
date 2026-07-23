import type { ImageRef, SiteContentBody } from '@vyvy/content-types';

const LEGACY_SEED_ASSETS: Record<string, string> = {
  'logo.png': '/placeholder-logo.png',
  'hero.png': '/images/hero-shopping.png',
  'cat-beauty.png': '/images/cat-beauty.png',
  'cat-fashion.png': '/images/cat-fashion.png',
  'cat-tech.png': '/images/cat-tech.png',
  'cat-kpop.png': '/placeholder.svg',
  'og.png': '/placeholder.svg',
};

function normalizeImage(image: ImageRef | undefined): ImageRef | undefined {
  if (!image) return undefined;

  let pathname: string;
  try {
    pathname = new URL(image.src, 'http://local.invalid').pathname;
  } catch {
    return image;
  }

  const match = /^\/media\/seed\/([^/]+)$/.exec(pathname);
  const replacement = match ? LEGACY_SEED_ASSETS[match[1]] : undefined;
  return replacement ? { ...image, src: replacement } : image;
}

/**
 * Releases created by an early local seed referenced a non-existent
 * `/media/seed/*` API route. Keep those immutable releases usable without
 * resetting MongoDB by translating only the known seed filenames to the web
 * app's bundled public assets. Uploaded/admin media URLs are left untouched.
 */
export function normalizeLegacySeedMedia(content: SiteContentBody): SiteContentBody {
  return {
    ...content,
    brand: {
      ...content.brand,
      logo: normalizeImage(content.brand.logo),
    },
    hero: {
      ...content.hero,
      media: normalizeImage(content.hero.media),
    },
    categories: content.categories?.map((category) => ({
      ...category,
      image: normalizeImage(category.image)!,
    })),
    reviews: content.reviews?.map((review) => ({
      ...review,
      avatar: normalizeImage(review.avatar),
    })),
    seo: {
      ...content.seo,
      ogImage: normalizeImage(content.seo.ogImage),
    },
  };
}
