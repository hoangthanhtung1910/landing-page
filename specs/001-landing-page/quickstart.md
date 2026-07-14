# Quickstart & Validation: VyVy Order Korea Landing Page

**Feature**: 001-landing-page | **Date**: 2026-07-14

A run/validation guide to prove the landing page meets the spec end-to-end. No implementation code here — see `tasks.md` (after `/speckit-tasks`) for build steps.

## Prerequisites

- Node.js (version compatible with Next.js 16) and a package manager (`pnpm` recommended — `pnpm-lock.yaml` is present).
- Work inside `korean-shopping-proxy/` (all app code lives here per project rules).

## Setup & run

```bash
cd korean-shopping-proxy
pnpm install          # or npm install
pnpm dev              # dev server, default http://localhost:3000
```

For a production-representative check (used for performance/SEO validation):

```bash
pnpm build
pnpm start            # serves the optimized build
```

## Validation scenarios

Each scenario maps to acceptance criteria / success criteria in [`spec.md`](./spec.md). Contract invariants referenced live in [`contracts/content-model.md`](./contracts/content-model.md) and [`contracts/contact-channels.md`](./contracts/contact-channels.md).

### V1 — Hero converts (US1, FR-004, INV-2)

1. Open the page on a mobile viewport (DevTools device toolbar, ~375px).
2. **Expect** above the fold: brand "VyVy Order Korea", a one-line Vietnamese value proposition, and a primary Zalo/Kakao contact button — all without scrolling.
3. **Expect** exactly one `<h1>` in the DOM (inspect / run an accessibility tree check).

### V2 — Contact reachable everywhere (US1 #2, FR-012)

1. Scroll to the very bottom of the page on the mobile viewport.
2. **Expect** a sticky bottom contact bar with Zalo + Kakao remains visible/reachable at every scroll position.

### V3 — Contact links resolve with fallback (US1 #3, FR-011)

1. Tap the Zalo action → **Expect** it navigates to `https://zalo.me/...` (opens app if installed, else web profile) in a new tab.
2. Tap the Kakao action → **Expect** `https://pf.kakao.com/...` behavior.
3. Confirm no link is a dead `#` for a configured channel; unconfigured placeholders are visibly "coming soon", not broken.

### V4 — Ordering process is clear (US2, FR-007, INV-5)

1. Scroll to the Ordering process section.
2. **Expect** sequential, numbered steps covering: send product link/request → receive quote → confirm & pay → purchase in Korea → international shipping → delivery in Vietnam.
3. **Expect** a contact CTA at/after the section end.
4. Comprehension check (SC-003): have 5 target users read it; ≥4 can restate the flow.

### V5 — Trust, categories, reviews (US3, FR-006/008/009, INV-4)

1. **Expect** a "Why choose us" section with ≥3 distinct trust points.
2. **Expect** a Product categories section including cosmetics, fashion, electronics, and K-pop goods, each distinguishable.
3. **Expect** a Customer reviews section with ≥3 attributed testimonials.

### V6 — Section order & completeness (FR-015, INV-1, INV-8)

1. Read the page top to bottom.
2. **Expect** exactly these sections in order: Hero → Services → Why choose us → Ordering process → Product categories → Customer reviews → Contact CTA → Footer.
3. **Expect** no leftover pricing/FAQ or off-spec sections.

### V7 — Vietnamese & diacritics (FR-001, FR-017)

1. **Expect** all visible copy is Vietnamese with correctly rendered diacritics (no □/? glyphs).
2. Increase browser/system font size ~150% → **Expect** text stays legible, nothing clipped.

### V8 — Responsive, no overflow (SC-007)

1. Test viewport widths 320px, 375px, 768px, 1280px.
2. **Expect** no horizontal scrollbar and no overlapping/clipped content at any width.

### V9 — Performance & SEO (SC-004, SC-006, FR-014)

1. On the production build, run Lighthouse (mobile) on the page.
2. **Expect** Performance ≥ 90 and above-the-fold + primary CTA usable < 3s on a throttled mid-range mobile profile.
3. **Expect** SEO ≥ 90 with: unique title + meta description (Vietnamese), single logical heading hierarchy, `alt` on all meaningful images, valid Open Graph/Twitter preview metadata, plus `robots.txt`, `sitemap.xml`, and JSON-LD present.

## Definition of done (validation)

All scenarios V1–V9 pass on the production build, and every checklist item in [`checklists/requirements.md`](./checklists/requirements.md) remains satisfied.
