# Contract: Content Model (UI ↔ Content)

**Feature**: 001-landing-page | **Date**: 2026-07-14

This landing page exposes no network API. Its internal contract is the shape of the content module (`lib/content.ts`) that section components consume. Section components MUST treat this content as their sole source of copy/data (no hardcoded strings), satisfying FR-016.

## Contract shape (TypeScript-facing)

```ts
// lib/content.ts exports a single `content: SiteContent`
interface SiteContent {
  brand: Brand
  hero: Hero
  services: ServiceOffering[]     // §2  length >= 3
  trustPoints: TrustPoint[]       // §3  length >= 3
  processSteps: ProcessStep[]     // §4  length >= 5, order 1..n contiguous
  categories: ProductCategory[]   // §5  MUST include cosmetics|fashion|electronics|kpop
  reviews: CustomerReview[]       // §6  length >= 3
  cta: ContactCTA                 // §7
  footer: Footer                  // §8
  contact: ContactChannel[]       // shared; MUST include >=1 zalo and >=1 kakao
}
```

Field-level definitions are in [`../data-model.md`](../data-model.md). This file defines the **invariants** each consumer relies on.

## Component consumption contract

| Component | Consumes | Renders as | Heading level |
|-----------|----------|-----------|---------------|
| `hero.tsx` | `content.hero`, `content.brand` | §1 | `<h1>` (the only one) |
| `services.tsx` | `content.services` | §2 | `<h2>` |
| `why-choose-us.tsx` | `content.trustPoints` | §3 | `<h2>` |
| `ordering-process.tsx` | `content.processSteps` | §4 | `<h2>` |
| `categories.tsx` | `content.categories` | §5 | `<h2>` |
| `testimonials.tsx` | `content.reviews` | §6 | `<h2>` |
| `cta-section.tsx` | `content.cta`, `content.contact` | §7 | `<h2>` |
| `site-footer.tsx` | `content.footer`, `content.contact` | §8 | `<h2>`/`<footer>` |
| `contact-bar.tsx` | `content.contact` (zalo, kakao) | sticky (mobile) | — |

## Invariants (MUST hold; verifiable)

- **INV-1 (order)**: `page.tsx` renders sections in exactly: Hero → Services → Why choose us → Ordering process → Product categories → Customer reviews → Contact CTA → Footer. (FR-015)
- **INV-2 (single h1)**: Exactly one `<h1>` in the rendered DOM, sourced from `hero.headline`. (SC-006)
- **INV-3 (language)**: Every string field is Vietnamese; `<html lang="vi">`. (FR-001)
- **INV-4 (categories)**: `categories` includes items whose ids/names map to cosmetics, fashion, electronics, and K-pop goods. (FR-008)
- **INV-5 (process coverage)**: `processSteps` in order describe link/request → quote → confirm+pay → purchase in Korea → international shipping → delivery in Vietnam. (FR-007)
- **INV-6 (contact presence)**: `contact` contains ≥1 `zalo` and ≥1 `kakao`; `cta.channels` references both. (FR-010)
- **INV-7 (alt text)**: Every `ImageRef` used for a meaningful image has non-empty `alt`. (SC-006)
- **INV-8 (no orphan sections)**: The rendered page contains no sections beyond the mandated eight (e.g., pricing/FAQ removed or merged). (FR-015)

## Change contract

Business content updates (new reviews, changed handles, new categories, reworded copy) are made **only** by editing `lib/content.ts` / `lib/contact.ts` — no component or layout change required. (FR-016)
