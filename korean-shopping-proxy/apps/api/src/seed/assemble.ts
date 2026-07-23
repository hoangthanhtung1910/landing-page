import type {
  CtaRef,
  ContactChannelType,
  SiteContentBody,
} from '@vyvy/content-types';
import type { SeedData } from './seed.data';

/** Stable ids for each list item, aligned by index with the seed data.
 * (Public ContactChannel has no id, so contacts are not listed here.) */
export interface SeedIds {
  services: string[];
  trustPoints: string[];
  processSteps: string[];
  categories: string[];
  reviews: string[];
  faq: string[];
}

/**
 * Assemble the public release content (SiteContent without `meta`) from seed data
 * + persisted ids. Per-entity mapping (NOT a blanket strip) so that:
 *  - `order` is PRESERVED for processSteps and faq (required by the public type),
 *  - `order`/`publishState` are dropped for entities whose public type omits them,
 *  - reviews expose only approved + consented items and NEVER moderation flags.
 * (Fixes P1-03 / P2-03.)
 */
export function assembleReleaseContent(
  data: SeedData,
  ids: SeedIds,
): SiteContentBody {
  return {
    brand: {
      name: data.brand.name,
      slogan: data.brand.slogan,
      tagline: data.brand.tagline,
      logo: data.brand.logo,
    },
    hero: {
      headline: data.hero.headline,
      subheadline: data.hero.subheadline,
      primaryCta: data.hero.primaryCta as CtaRef,
      secondaryCta: data.hero.secondaryCta as CtaRef | undefined,
      media: data.hero.media,
    },
    services: data.services.map((s, i) => ({
      id: ids.services[i],
      title: s.title,
      description: s.description,
      icon: s.icon,
    })),
    trustPoints: data.trustPoints.map((t, i) => ({
      id: ids.trustPoints[i],
      title: t.title,
      description: t.description,
      icon: t.icon,
    })),
    processSteps: data.processSteps.map((p, i) => ({
      id: ids.processSteps[i],
      order: p.order, // PRESERVED (required by public type)
      title: p.title,
      description: p.description,
      icon: p.icon,
    })),
    categories: data.categories.map((c, i) => ({
      id: ids.categories[i],
      name: c.name,
      image: c.image,
      blurb: c.blurb,
    })),
    reviews: data.reviews
      .map((r, i) => ({ ...r, id: ids.reviews[i] }))
      .filter((r) => r.approved && r.consentGiven)
      .map((r) => ({
        id: r.id,
        name: r.name,
        text: r.text,
        rating: r.rating,
        location: r.location,
        // NOTE: `approved`/`consentGiven` intentionally omitted (public shape).
      })),
    faq: data.faq.map((f, i) => ({
      id: ids.faq[i],
      order: f.order, // PRESERVED (required by public type)
      question: f.question,
      answer: f.answer,
    })),
    cta: {
      headline: data.cta.headline,
      subtext: data.cta.subtext,
      channels: data.cta.channels as CtaRef[],
    },
    footer: {
      contactSummary: data.footer.contactSummary,
      links: data.footer.links,
      copyright: data.footer.copyright,
    },
    contact: data.contactChannels.map((c) => ({
      type: c.type as ContactChannelType,
      label: c.label,
      handle: c.handle,
      icon: c.icon,
      external: c.external,
    })),
    seo: {
      title: data.seo.title,
      description: data.seo.description,
      canonical: data.seo.canonical,
      ogImage: data.seo.ogImage,
    },
  };
}
