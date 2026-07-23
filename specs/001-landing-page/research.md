# Phase 0 Research: VyVy Order Korea Landing Page + CMS

**Feature**: 001-landing-page | **Date**: 2026-07-14 (revised 2026-07-16 for CMS architecture)

This document records the key design decisions (with rationale and rejected alternatives) that shape
Phase 1. The **revised architecture** replaces the original static single-page model with a three-tier
content-managed system (Admin dashboard → CMS API → database → landing page). Decisions 1–3 below
supersede the original static decisions; Decisions 4–8 (contact links, persistent CTA, palette, SEO,
accessibility) remain valid. Decisions 9–14 are new CMS/operational decisions and reflect the choices
confirmed by the business on 2026-07-16.

> **Superseded**: The earlier decisions "adapt static scaffold as the content source", "fully static
> with no data source", and "centralize copy in `lib/content.ts`" are replaced by the CMS. The landing
> page is still statically rendered, but its content now comes from the CMS public endpoint at
> build/regeneration time; build/deploy is fail-closed (no custom last-good snapshot).

## Decision 1 — Overall architecture: three-tier CMS

- **Decision**: Build a NestJS + MongoDB CMS API, a Next.js admin dashboard, and keep the Next.js
  landing page — restructured as a pnpm-workspace monorepo inside `korean-shopping-proxy/`
  (`apps/web`, `apps/admin`, `apps/api`, `packages/content-types`).
- **Rationale**: Non-developers must manage every landing-page section without code changes or
  redeploys (FR-016, FR-021–FR-032). This requires persistence, authentication, validation, and a
  publish workflow — none of which a static file provides.
- **Alternatives considered**: Static `lib/content.ts` (rejected — cannot be edited by non-devs, needs
  a deploy per change); git-backed/MDX content (rejected — same deploy-to-edit problem, no auth/
  validation); a hosted SaaS CMS (rejected for v1 — external dependency and data-ownership concerns,
  though not precluded later).

## Decision 2 — Rendering strategy (retained, re-sourced)

- **Decision**: The landing page stays statically generated (SSG) via React Server Components with
  **Incremental Static Regeneration**. Content is fetched **server-side at build/regeneration time**
  from the CMS public endpoint — never client-side. Only interactive bits (sticky contact bar, theme
  toggle) are client components.
- **Rationale**: Preserves fast first paint and SEO (SC-004, SC-006, FR-024) while allowing content to
  change without a code deploy. ISR + on-publish revalidation makes edits appear within a bounded
  window (FR-048).
- **Alternatives considered**: Client-side fetching (rejected — harms SEO/first paint); full SSR per
  request (rejected — unnecessary for low-change marketing content and slower than cached SSG).

## Decision 3 — Content modeling: revisions + page releases

- **Decision**: Model content as **revisions** (versioned per-item copies) plus a **page-release**
  document that references the exact published revisions of every section and carries per-section
  visibility. A single **current-release pointer** identifies the live page. Publishing writes a new
  release and advances the pointer atomically. Do NOT model each section as an independently-mutated
  collection.
- **Rationale**: Guarantees publishing integrity and atomic releases (FR-033, FR-034): editing never
  disturbs the live page, and visitors always see one internally-consistent release. A page-level
  release also makes rollback (FR-035) natural. (Build integrity for outages is handled by fail-closed
  builds, Decision 11 — not by a snapshot.)
- **Alternatives considered**: One mutable collection per section with a `publishState` flag (rejected
  — editing a published record risks exposing drafts or mixing editorial releases, and cross-section
  publish has no atomic boundary); full event-sourcing (rejected — over-engineered for this scale).

## Decision 4 — Zalo / Kakao contact links + fallback (retained)

- **Decision**: Model each contact channel with a canonical https deep link and web fallback in
  `apps/web/lib/contact.ts`. Zalo → `https://zalo.me/<handle>`; Kakao → `https://pf.kakao.com/<handle>`;
  phone → `tel:`. Links open in a new tab with `rel="noopener noreferrer"`. Channel data now comes
  from CMS-managed contact content instead of a static file.
- **Rationale**: https channel URLs self-degrade to a web page when the app is absent (FR-011) without
  fragile custom schemes. See `contracts/contact-channels.md`.
- **Alternatives considered**: Custom URI schemes `zalo://`/`kakaotalk://` (rejected — dead-end with no
  app); embedded chat SDK (rejected — weight/privacy/SEO cost).

## Decision 5 — Persistent contact affordance (retained, extended)

- **Decision**: Sticky bottom contact bar on mobile (Zalo + Kakao) plus repeated inline CTAs. On
  **desktop**, a sticky header or floating contact affordance keeps a contact action reachable at any
  scroll position (not solely non-sticky header CTAs).
- **Rationale**: Satisfies FR-012 on all supported layouts (the original desktop assumption was
  tightened after review). Supports US1 conversion.
- **Alternatives considered**: Hero CTA only (rejected — fails FR-012); non-sticky desktop header
  (rejected — contact not reachable when scrolled).

## Decision 6 — Korean-premium visual language & brand palette (retained)

- **Decision**: Warm, friendly, premium-but-approachable design; Be Vietnam Pro; generous whitespace;
  brand palette as Tailwind theme tokens in `apps/web/app/globals.css` — main soft pink, secondary
  beige, accent Korea red (sparingly, for primary CTA), background warm white.
- **Rationale**: Matches Brand Identity (FR-003, FR-019, FR-020). Token-driven theming keeps palette
  consistent and tunable for WCAG AA contrast.
- **Alternatives considered**: Dark luxury theme (rejected — off-brand, worse mobile legibility); red as
  main color (rejected — spec designates pink main, red accent).

## Decision 7 — SEO implementation (retained)

- **Decision**: Next.js Metadata API for title/description/canonical/OG/Twitter (Vietnamese), driven by
  **CMS-managed SEO content**; `app/sitemap.ts` + `app/robots.ts`; JSON-LD `LocalBusiness`/`Service`,
  with `AggregateRating` emitted **only when eligible real approved reviews exist**; one `<h1>` with
  logical heading order; descriptive `alt` on all meaningful images.
- **Rationale**: Satisfies FR-014/SC-006 with framework-native mechanisms; conditional AggregateRating
  avoids misleading structured data (FR-043).
- **Alternatives considered**: Third-party SEO libs (rejected — Metadata API suffices); always-on
  AggregateRating (rejected — misleading when reviews are empty/placeholder).

## Decision 8 — Accessibility & diacritics (retained, expanded)

- **Decision**: Be Vietnam Pro with the `vietnamese` subset; relative units/fluid type; ≥44px tap
  targets; full keyboard access, visible focus, labels/landmarks, sufficient contrast, accessible error
  messaging; verified with an automated a11y check; layout tested 320px→desktop.
- **Rationale**: Correct diacritics and legibility under enlarged fonts (FR-017), plus the broadened
  accessibility baseline (FR-042) and no-overflow guarantee (SC-007).
- **Alternatives considered**: Non-Vietnamese-subset font (rejected — broken glyphs); font-size-only
  a11y (rejected — misses keyboard/contrast/labels).

## Decision 9 — Admin authentication: cookie sessions (DECIDED)

- **Decision**: Cookie-based admin sessions — an `HttpOnly` session cookie, `Secure` in production,
  with `SameSite` protection and a server-side session record; CSRF protection on state-changing
  requests; CORS restricted to the known web/admin origins. Passwords hashed with bcrypt/argon2.
  Admin authentication only (no visitor login). No JWT/bearer-in-JS storage.
- **Rationale**: Cookie sessions avoid storing tokens in JS (XSS exposure) and, with CSRF + restricted
  CORS, give a secure admin surface (FR-025, FR-038). A single administrator role is sufficient for v1;
  granular roles are deferred.
- **Alternatives considered**: JWT-in-localStorage/bearer (rejected — XSS token theft, manual
  revocation); third-party auth provider (rejected — unnecessary for a single seeded admin in v1).

## Decision 10 — Media: public storage with admin-only upload (DECIDED)

- **Decision**: Media is publicly readable via stable URLs; only authenticated admins can
  upload/update/delete. Files are stored behind a **storage abstraction** — a local-disk adapter for
  development, designed for straightforward migration to S3/CDN — with metadata in MongoDB. Uploads are
  MIME-allowlisted via content inspection, size/dimension limited, and stored under generated
  (non-guessable) object keys. No signed URLs in v1. Deletion is reference-aware.
- **Rationale**: Landing-page imagery is public marketing content, so public URLs give the best
  cache/CDN behavior and simplest `next/image` configuration (FR-027, FR-039). The abstraction keeps a
  clean path to S3/CDN without rework.
- **Alternatives considered**: Signed URLs (rejected for v1 — unstable URLs, poor caching, unneeded for
  public assets); storing binaries in MongoDB/GridFS (rejected — worse delivery/caching than object
  storage); local disk as the production store (rejected — ephemeral on scaled/redeployed hosts).

## Decision 11 — Build integrity: fail-closed, no custom snapshot (DECIDED, revised 2026-07-16)

- **Decision**: Do **not** build any durable last-good snapshot, `last-good.json`, snapshot collection,
  snapshot object-storage file, or bespoke fallback. Instead the system behaves like a normal
  content-managed website: the web app fetches `GET /public/content` at build/regeneration time with a
  bounded timeout and rejects malformed/partial responses. Build/deploy is **fail-closed** — if a build
  cannot obtain valid published content, the build fails and is not promoted (no empty page to
  production). At runtime, Next.js's default ISR behavior serves the last successfully generated page if
  a later background revalidation fails; this is Next's built-in behavior, not a custom mechanism. The
  CMS API must therefore be reachable during the first build/deploy.
- **Rationale**: A custom snapshot layer adds storage, write-path, staleness, and consistency
  complexity that this single low-traffic site does not need. Fail-closed builds guarantee production
  never serves an empty/broken page (FR-030, SC-012) with far less machinery, and Next.js ISR already
  provides runtime tolerance of transient CMS outages after a successful build.
- **Alternatives considered**: Persisted last-good snapshot / snapshot collection (rejected by the
  business 2026-07-16 — unnecessary complexity for v1); serving an empty page when the CMS is down
  (rejected — violates "never ship an empty page"); committing content to the repo (rejected —
  reintroduces deploy-to-edit).

## Decision 12 — Hybrid section model + FAQ (DECIDED)

- **Decision**: **Required** sections (Hero, Contact CTA, Footer) always render and cannot be disabled.
  **Optional** sections (Services, Why-choose-us, Ordering-process, Product categories, Customer
  reviews, and a new **FAQ**) can be enabled/disabled per section by an administrator. Rendered
  sections follow the fixed relative order; disabled ones are omitted; enabled-but-empty sections show
  a defined honest empty state.
- **Rationale**: Balances the mandated conversion structure (Hero/CTA/Footer always present) with
  editorial flexibility (FR-015, FR-040, FR-041, FR-050, FR-051). FAQ is added as an in-scope optional
  section (the previously off-spec `faq.tsx` is repurposed).
- **Alternatives considered**: All eight sections always mandatory (rejected — conflicts with visibility
  control and honest empty states); fully free-form section composition (rejected — out of scope for
  v1, added complexity).

## Decision 13 — NestJS as a modular monolith

- **Decision**: One NestJS service organized into modules: auth/users, content (per-section
  schemas/DTOs/services/controllers), releases (revisions, page-release, atomic publish, rollback,
  rollback), media, audit, public delivery, and health/ops.
- **Rationale**: The scale (one low-traffic marketing site, light admin usage) does not justify
  separate microservices; a modular monolith is simpler to build, test, and deploy while keeping clear
  module boundaries.
- **Alternatives considered**: Microservices per concern (rejected — operational overhead unjustified
  at this scale); a single unstructured app (rejected — poor testability and boundaries).

## Decision 14 — Cache invalidation & refresh SLA

- **Decision**: ISR with a `revalidate` window plus a secret-guarded on-demand revalidation route the
  API calls on publish (release-aware cache tags). Failed invalidation triggers are retried; a periodic
  safety revalidation backstops missed triggers; publish-to-live latency/failures are observable.
- **Rationale**: Meets the "visible within ~5 minutes without a code deploy" target (SC-008, FR-031,
  FR-048) while keeping the API read load low and surfacing failures instead of silently going stale.
- **Alternatives considered**: Time-based ISR only (rejected — up to the full window of staleness);
  full rebuild per publish (rejected — slow, deploy-like); no retry on failed triggers (rejected —
  silent staleness).

## Open items handed to business (non-blocking for Phase 0, blocking for launch)

Tracked in spec Assumptions and the launch gate (FR-045): real Zalo/Kakao handles + phone, final
logo/brand assets, real approved customer reviews (with consent), category imagery, OG image, and the
final canonical domain. Placeholder/seed content is development-only and must not reach production.
