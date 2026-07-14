# Phase 0 Research: VyVy Order Korea Landing Page

**Feature**: 001-landing-page | **Date**: 2026-07-14

The Technical Context contained no `NEEDS CLARIFICATION` markers — the stack is fixed by the existing repo and `CLAUDE.md`. This document records the key design decisions (each with rationale and rejected alternatives) that shape Phase 1.

## Decision 1 — Reuse the existing scaffold vs. rebuild

- **Decision**: Adapt the existing v0-generated Next.js 16 app in place; rebrand and restructure rather than regenerate.
- **Rationale**: The scaffold already provides the mandated stack (Next.js/TS/Tailwind v4/shadcn), a Vietnamese font (Be Vietnam Pro), `lang="vi"`, analytics, and most section components. Reuse is faster and lower-risk than rebuilding and keeps changes inside `korean-shopping-proxy/` per project rules.
- **Alternatives considered**: Fresh scaffold (rejected — throws away working, on-stack code); different framework (rejected — violates mandated stack).

## Decision 2 — Rendering strategy

- **Decision**: Fully static rendering (SSG) via React Server Components with no client data fetching; only interactive bits (sticky contact bar, any menu toggle) are client components.
- **Rationale**: Content is static marketing copy. SSG gives the fastest first paint and best Lighthouse mobile/SEO scores, directly supporting SC-004 and SC-006. `images.unoptimized` is already set, so images are served statically.
- **Alternatives considered**: SSR (unnecessary — no per-request data); CSR/SPA (rejected — worse SEO and first paint).

## Decision 3 — Content architecture

- **Decision**: Centralize all Vietnamese copy and structured data (services, trust points, process steps, categories, reviews, contact channels) in a typed `lib/content.ts` module; section components render from it.
- **Rationale**: Satisfies FR-016 (content maintainable without redesign) and makes future handoff of real reviews/handles a one-file edit. Typed data prevents shape drift between sections and the data-model.
- **Alternatives considered**: Hardcoding copy inside each component (rejected — scatters edits, invites diacritic/consistency bugs); a CMS/MDX (rejected — over-engineered for one static page, adds deps/infra).

## Decision 4 — Zalo / Kakao contact links + fallback

- **Decision**: Model each contact channel in `lib/contact.ts` with a canonical deep link and an explicit web fallback URL. Zalo → `https://zalo.me/<phone-or-oaid>`; Kakao → KakaoTalk channel URL `https://pf.kakao.com/<channelId>` (opens app when installed, web profile otherwise). Phone → `tel:` link. Links open in a new tab with `rel="noopener noreferrer"`.
- **Rationale**: These https channel URLs already act as their own web fallback (browser opens the app via app-link if installed, else the web profile), satisfying FR-011 without fragile custom-scheme handling. Centralizing in one module keeps real handles editable per FR-016.
- **Alternatives considered**: Custom URI schemes (`kakaotalk://`, `zalo://`) — rejected: dead-ends when the app is absent, no graceful web fallback. Embedded chat SDK — rejected: extra weight, privacy/SEO cost, not needed for a "start a conversation" goal.

## Decision 5 — Persistent contact affordance (FR-012)

- **Decision**: A sticky bottom contact bar on mobile (Zalo + Kakao buttons) plus repeated inline CTAs (hero, end of process, dedicated CTA section). Bar is hidden on desktop where header CTAs remain visible.
- **Rationale**: Mobile-first users rarely scroll back up; a thumb-reachable sticky bar maximizes conversion (US1) and directly satisfies "reachable from any scroll position". Desktop already keeps a header CTA in view.
- **Alternatives considered**: Single hero CTA only (rejected — fails FR-012); floating single round button (viable, but two-channel bar communicates both options at a glance).

## Decision 6 — Korean-premium visual language & brand palette

- **Decision**: Warm, friendly, premium-but-approachable design with refined typography (Be Vietnam Pro), generous whitespace, soft rounded cards, and subtle shadows. Apply the specified brand palette as Tailwind v4 theme tokens in `globals.css`:
  - **Main — soft pink**: dominant brand color; primary buttons/CTAs, headline accents, key highlights.
  - **Secondary — beige**: supporting surfaces, alternating section backgrounds, cards.
  - **Accent — Korea red**: used sparingly for the primary contact CTA, badges, and small high-emphasis highlights so it stays impactful.
  - **Background — warm white**: base page background for an airy, spacious feel.
  - Foreground text uses a warm dark neutral to preserve contrast on the light palette.
- **Rationale**: Matches the Brand Identity section (name/slogan/personality/palette) and the "friendly, trustworthy, premium but approachable" direction; the existing `#e04a3f`-family red is repurposed as the *Korea red accent* rather than the main color. Token-driven theming keeps the palette consistent and lets exact hex values be tuned for accessibility without touching components.
- **Contrast note**: Because the palette is light (pink/beige/warm white), body text and interactive labels must meet WCAG AA contrast; accent (Korea red) is favored for the primary CTA to guarantee it stands out (supports SC-002, SC-005).
- **Alternatives considered**: Dark luxury theme (rejected — off-brand for the friendly/approachable personality and lower mobile legibility); keeping red as the main color (rejected — spec designates soft pink as main and red as a sparing accent); heavy imagery-first hero (rejected — hurts mobile first-paint budget SC-004).

## Decision 7 — SEO implementation (FR-014, SC-006)

- **Decision**: Use Next.js Metadata API in `app/layout.tsx`/`page.tsx` for title, description, canonical, and Open Graph/Twitter cards (Vietnamese, Korea–Vietnam shopping keywords); add `app/sitemap.ts` and `app/robots.ts`; embed JSON-LD structured data (`LocalBusiness`/`Service` + `AggregateRating` from reviews); enforce one `<h1>` with logical heading order and descriptive `alt` on all meaningful images; provide a static OG image in `public/`.
- **Rationale**: Directly satisfies FR-014 and the SC-006 audit criteria with framework-native, zero-dependency mechanisms.
- **Alternatives considered**: Third-party SEO libs (rejected — Next.js Metadata API is sufficient); skipping structured data (rejected — misses rich-result opportunity and SC-006 completeness).

## Decision 8 — Accessibility & diacritics (FR-017, SC-007)

- **Decision**: Load Be Vietnam Pro with the `vietnamese` subset (already configured); use relative units and fluid type so text scales with system font size; meet ≥44px tap targets; test layout at 320px→desktop for zero horizontal overflow.
- **Rationale**: Guarantees correct diacritic rendering and legibility under enlarged fonts (FR-017) and the no-overflow guarantee (SC-007).
- **Alternatives considered**: A non-Vietnamese-subset font (rejected — risks missing/!broken glyphs); fixed px typography (rejected — doesn't honor user font scaling).

## Open items handed to business (non-blocking)

Tracked in spec Assumptions; placeholders used until supplied: real Zalo/Kakao handles + phone, final logo/brand colors, real customer reviews, category imagery, OG image.
