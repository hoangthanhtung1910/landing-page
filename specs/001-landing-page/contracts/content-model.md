# Contract: Public Content API (`GET /public/content`)

**Feature**: 001-landing-page | **Date**: 2026-07-14 (revised 2026-07-16 for CMS architecture)

This supersedes the original "no network API / local `lib/content.ts`" contract. The landing page now
consumes a **network API**: a single public, read-only endpoint returning the current published page
release. Section components MUST treat this response as their sole source of copy/data (no hardcoded
strings), satisfying FR-016. Field-level definitions live in [`../data-model.md`](../data-model.md).

## Endpoint

```
GET /public/content
```

- **Auth**: none (public, read-only).
- **Returns**: the current **page release** as `SiteContent` — published + enabled sections only;
  never drafts, disabled sections, or admin-only fields (FR-023).
- **Versioning (v1 = current unversioned path)**: the canonical v1 path is `/public/content` (no
  version prefix). Path-based versioning (`/v2/public/content`) is **explicitly deferred** and will be
  introduced only on the first breaking change; until then `/public/content` IS the stable v1 contract
  (FR-047). This path is used consistently by the API controller, web client, plan, tasks, and quickstart.

### Response `200`

```jsonc
{
  "meta": { "releaseNumber": 42, "publishedAt": "2026-07-16T09:00:00Z" },
  "brand":       { "name": "VyVy Order Korea", "slogan": "…", "logo": { "src": "…", "alt": "…" } },
  "hero":        { "headline": "…", "subheadline": "…", "primaryCta": { … } },   // required
  "services":    [ … ],   // optional — present only if the section is enabled
  "trustPoints": [ … ],   // optional
  "processSteps":[ … ],   // optional, ordered
  "categories":  [ … ],   // optional
  "reviews":     [ … ],   // optional — omitted/empty when no approved reviews (never fabricated)
  "faq":         [ … ],   // optional (new)
  "cta":         { "headline": "…", "channels": [ … ] },  // required
  "footer":      { … },   // required
  "contact":     [ { "type": "zalo", … }, { "type": "kakao", … } ],
  "seo":         { "title": "…", "description": "…", "ogImage": { … } }
}
```

- **Headers**: `ETag` derived from `meta.releaseNumber`; `Cache-Control` suitable for CDN/ISR. A
  conditional `GET` with `If-None-Match` MAY return `304`.
- **Optional sections**: keys for disabled optional sections are omitted (or `null`); required section
  keys (`brand`, `hero`, `cta`, `footer`, `contact`, `seo`) are always present.

### TypeScript-facing shape (from `packages/content-types`)

```ts
interface SiteContent {
  meta: { releaseNumber: number; publishedAt: string }
  brand: Brand
  hero: Hero                       // required
  services?: ServiceOffering[]     // optional §2
  trustPoints?: TrustPoint[]       // optional §3
  processSteps?: ProcessStep[]     // optional §4, order 1..n contiguous
  categories?: ProductCategory[]   // optional §5, includes cosmetics|fashion|electronics|kpop
  reviews?: CustomerReview[]       // optional §6, approved only
  faq?: FaqItem[]                  // optional (new)
  cta: ContactCTA                  // required §7
  footer: Footer                   // required §8
  contact: ContactChannel[]        // shared; >=1 zalo and >=1 kakao; each type unique (INV-10)
  seo: Seo
}
```

These are **response types only**. The API validates stored documents and (for the admin API) incoming
requests at runtime — TypeScript types do not validate untrusted data (FR-029).

## Web consumption contract

The landing page fetches this response **server-side at build/regeneration time** via
`apps/web/lib/cms.ts` (bounded timeout, rejects malformed/partial responses). Build/deploy is
**fail-closed**: if valid published content cannot be fetched during a build, the build fails rather
than shipping an empty page — there is **no custom last-good/snapshot fallback**; runtime resilience
relies on Next.js ISR defaults (FR-030). The page is statically generated (SSG + ISR), not
client-fetched (FR-024).

| Component | Consumes | Renders as | Heading | Section kind |
|-----------|----------|-----------|---------|--------------|
| `hero.tsx` | `content.hero`, `content.brand` | §1 | `<h1>` (only one) | required |
| `services.tsx` | `content.services` | §2 | `<h2>` | optional |
| `why-choose-us.tsx` | `content.trustPoints` | §3 | `<h2>` | optional |
| `ordering-process.tsx` | `content.processSteps` | §4 | `<h2>` | optional |
| `categories.tsx` | `content.categories` | §5 | `<h2>` | optional |
| `testimonials.tsx` | `content.reviews` | §6 | `<h2>` | optional |
| `faq.tsx` | `content.faq` | FAQ | `<h2>` | optional |
| `cta-section.tsx` | `content.cta`, `content.contact` | §7 | `<h2>` | required |
| `site-footer.tsx` | `content.footer`, `content.contact` | §8 | `<footer>` | required |
| `contact-bar.tsx` | `content.contact` (zalo, kakao, optional messenger) | sticky (mobile) | — | — |

## Invariants (MUST hold; verifiable)

- **INV-1 (order)**: rendered sections follow the relative order Hero → Services → Why choose us →
  Ordering process → Product categories → Customer reviews → FAQ → Contact CTA → Footer; disabled
  optional sections are omitted, required sections keep their positions. (FR-015)
- **INV-2 (single h1)**: exactly one `<h1>`, from `hero.headline`. (SC-006)
- **INV-3 (language)**: every string is Vietnamese; `<html lang="vi">`. (FR-001)
- **INV-4 (categories)**: when the categories section is present, it includes cosmetics, fashion,
  electronics, and K-pop goods. (FR-008)
- **INV-5 (process coverage)**: when present, `processSteps` in order describe link/request → quote →
  confirm+pay → purchase in Korea → international shipping → delivery in Vietnam. (FR-007)
- **INV-6 (contact presence)**: `contact` contains ≥1 `zalo` and ≥1 `kakao`; `cta.channels` references
  both. (FR-010)
- **INV-7 (alt text)**: every `ImageRef` for a meaningful image has non-empty `alt`. (SC-006)
- **INV-8 (published-only, enabled-only)**: the response never includes drafts, admin-only fields, or
  disabled sections; it represents exactly one release (`meta.releaseNumber`). (FR-023, FR-034, FR-051)
- **INV-9 (authentic reviews)**: `reviews`, when present, contains only approved testimonials; the
  section is empty/omitted rather than fabricated. (FR-043)
- **INV-10 (deterministic contact identity)**: within `content.contact`, each channel `type`
  (`zalo`|`kakao`|`messenger`|`phone`|`email`|`social`) appears **at most once**, so a `CtaRef` — which addresses
  its destination by `type` alone — resolves to exactly one contact record independent of array order.
  Full-page validation rejects a duplicated type at `contact.<index>.type`. Every published contact
  `handle` is non-empty and valid for its `type`; the public schema carries no `href` (the web app
  derives the link from `type` + `handle`). (FR-004, FR-010)

## Change & compatibility contract

- Business content updates are made **only** through the admin API/dashboard (no code change) and
  become live via publish + revalidation (FR-016, FR-031, FR-048).
- The response shape is stable within a version; breaking changes require a new API version (FR-047).
- Contract tests assert the response matches this document and the invariants above, preventing drift
  between the API, `packages/content-types`, and the web app.
