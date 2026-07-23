# Quickstart & Validation: VyVy Order Korea Landing Page + CMS

**Feature**: 001-landing-page | **Date**: 2026-07-14 (revised 2026-07-16 for CMS architecture)

A run/validation guide to prove the system meets the spec end-to-end. No implementation code here —
see `tasks.md` for build steps. The system is a pnpm-workspace monorepo inside `korean-shopping-proxy/`
with three apps (`apps/web`, `apps/admin`, `apps/api`) plus MongoDB and media storage.

## Prerequisites

- Node.js (compatible with Next.js 16) and `pnpm`.
- MongoDB (local via Docker or a connection string).
- Media storage: the local-disk adapter is fine for development (S3/CDN is a later migration).
- Work inside `korean-shopping-proxy/` (all app code lives here per project rules).

## Setup & run

```bash
cd korean-shopping-proxy
pnpm install

# 1) Start MongoDB (example: docker) and copy env templates
cp apps/api/.env.example apps/api/.env      # MONGO_URI, session secret, storage config, WEB_REVALIDATE_URL, REVALIDATE_SECRET
cp apps/web/.env.example apps/web/.env       # CMS_PUBLIC_URL, REVALIDATE_SECRET

# 2) Seed content + initial admin (idempotent)
pnpm --filter api seed

# 3) Run the API, the landing page, and the admin dashboard
pnpm --filter api dev        # CMS API (e.g. http://localhost:4000)
pnpm --filter web dev        # landing page (e.g. http://localhost:3000)
pnpm --filter admin dev      # admin dashboard (e.g. http://localhost:3001)
```

Production-representative check (for performance/SEO validation):

```bash
pnpm --filter web build && pnpm --filter web start
```

## Validation scenarios

Each maps to acceptance/success criteria in [`spec.md`](./spec.md). Contract invariants live in
[`contracts/content-model.md`](./contracts/content-model.md), [`contracts/admin-api.md`](./contracts/admin-api.md),
and [`contracts/contact-channels.md`](./contracts/contact-channels.md).

### V1 — Hero converts (US1, FR-004, INV-2)
1. Open the page on a mobile viewport (~375px).
2. **Expect** above the fold: brand "VyVy Order Korea", a one-line Vietnamese value proposition, and a
   primary Zalo/Kakao contact button — no scrolling. Content is CMS-published.
3. **Expect** exactly one `<h1>`.

### V2 — Contact reachable everywhere, both layouts (US1 #2, FR-012)
1. On mobile, scroll to the bottom → **Expect** a sticky contact bar (Zalo + Kakao) stays reachable.
2. On desktop, scroll down → **Expect** a sticky header or floating contact affordance keeps a contact
   action reachable (not only a non-sticky header CTA).

### V3 — Contact links resolve with fallback (US1 #3, FR-011)
1. Tap Zalo → `https://zalo.me/...`; tap Kakao → `https://pf.kakao.com/...` (app if installed, else web).
2. No configured channel is a dead `#`.

### V4 — Admin manages content end-to-end (US2, FR-022/025/026/032)
1. Log in to the admin dashboard (seeded admin). **Expect** a cookie session (HttpOnly); an
   unauthenticated write to the admin API returns `401`.
2. Edit the hero headline and add a customer review as a **draft**; **Expect** the public endpoint still
   returns the old content (draft not exposed — FR-033).
3. Publish. **Expect** `GET /public/content` returns the new release (`meta.releaseNumber` incremented)
   and the landing page reflects it after revalidation (target < 5 min, SC-008).
4. Submit invalid content (missing required field / rating out of range) → **Expect** `422` and the live
   content unchanged (FR-029).
5. Open two editors on the same item; save the stale one → **Expect** `409 Conflict` (FR-036).

### V5 — Media (US2, FR-027/039)
1. As admin, upload an image → **Expect** a stable public URL; the landing page can reference it.
2. Upload a disallowed type / oversize file → **Expect** rejection.
3. Try to delete an image used by the current release → **Expect** `409` (reference-aware).

### V6 — Draft/publish, rollback & atomicity (US2, FR-034/035, SC-013)
1. Make several edits and publish → **Expect** the live page reflects exactly one release.
2. Trigger a publish that fails validation → **Expect** the prior release stays live.
3. Roll back from the admin dashboard → **Expect** the previous release is restored (pointer reverted)
   and an audit event recorded.

### V7 — Section visibility & FAQ (FR-015/040/041/050/051)
1. Disable an optional section (e.g., Reviews or FAQ) and publish → **Expect** it is omitted from the
   page; required sections (Hero, Contact CTA, Footer) always remain.
2. Enable FAQ with Q/A items → **Expect** it renders between Reviews and Contact CTA.
3. Enable Reviews with no approved testimonials → **Expect** an honest empty state, never fabricated
   customers.

### V8 — Fail-closed build integrity (SC-012, FR-030)
1. Stop the CMS API, then run a fresh production build → **Expect** the build **fails** (non-zero exit),
   so no empty/broken page is promoted to production. There is no custom snapshot fallback.
2. Point the web app at an endpoint returning a malformed/partial response and build → **Expect** the
   build fails (the response is treated as invalid, not a valid page).
3. With the CMS up, build successfully; then stop the CMS and trigger an ISR revalidation → **Expect**
   the already-built page keeps serving (Next.js ISR default behavior), not an empty page.

### V9 — Ordering process clarity (US3, FR-007, INV-5)
1. When enabled, **Expect** sequential steps: link/request → quote → confirm & pay → purchase in Korea →
   international shipping → delivery in Vietnam, plus a closing contact CTA.
2. Comprehension check (SC-003): 5 users read it; ≥4 restate the flow.

### V10 — Trust & categories (US4, FR-006/008)
1. **Expect** "Why choose us" ≥3 trust points when enabled.
2. **Expect** categories include cosmetics, fashion, electronics, K-pop goods when enabled.

### V11 — Vietnamese & diacritics (FR-001, FR-017)
1. All visible copy Vietnamese with correct diacritics.
2. Increase system font ~150% → text stays legible, nothing clipped.

### V12 — Responsive, no overflow (SC-007)
1. Test 320/375/768/1280px → no horizontal scrollbar, no overlap/clip.

### V13 — Accessibility (FR-042, SC-006)
1. Keyboard-only: all interactive elements reachable with visible focus; forms have labels; errors are
   announced. Automated a11y check passes.

### V14 — Performance & SEO (SC-004/006/011, FR-014)
1. Production build → Lighthouse (mobile): Performance ≥ 90, SEO ≥ 90; AF + primary CTA usable < 3s.
2. Unique Vietnamese title + meta description, single heading hierarchy, `alt` on meaningful images,
   valid OG/Twitter metadata, `robots.txt`, `sitemap.xml`, and JSON-LD present. `AggregateRating` is
   emitted only when eligible real reviews exist.
3. `GET /public/content` p95 < 500 ms.

### V15 — Security & access (SC-010)
1. 100% of admin write endpoints reject unauthenticated requests; CORS limited to known origins; the
   revalidate route is secret-guarded; the public endpoint never returns draft/disabled/admin-only data.

## Definition of done (validation)

All scenarios V1–V15 pass on the production build; every checklist item in
[`checklists/requirements.md`](./checklists/requirements.md) is satisfied; automated API/contract/e2e
tests are green; and the production launch gate (verified contact details, approved reviews, final
domain/assets/SEO, business approval) is met before go-live.
