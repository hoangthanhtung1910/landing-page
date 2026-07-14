# Implementation Plan: VyVy Order Korea Landing Page

**Branch**: `001-landing-page` | **Date**: 2026-07-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-landing-page/spec.md`

## Summary

Deliver a single-page, Vietnamese-language, mobile-first marketing landing page for **VyVy Order Korea** whose primary goal is to convert visitors into Zalo/Kakao contacts, backed by trust content and a clear ordering-process explanation, presented in a premium Korean aesthetic and optimized for SEO.

**Technical approach**: Adapt the existing Next.js 16 App Router scaffold in `korean-shopping-proxy/` (currently a v0-generated "SeoulBox" page). Rebrand to "VyVy Order Korea", restructure the section composition to the spec's mandated 8-section order, drive all copy from a single Vietnamese content module, wire real Zalo/Kakao contact actions plus a persistent mobile contact affordance, and complete SEO metadata (title, description, Open Graph, JSON-LD, semantic headings, image alt text). Rendering is static (SSG) for fast first paint on mobile.

## Technical Context

**Language/Version**: TypeScript 5.7, React 19

**Primary Dependencies**: Next.js 16 (App Router, RSC), Tailwind CSS v4, shadcn/ui (base-nova style), lucide-react (icons), `next/font` (Be Vietnam Pro), @vercel/analytics

**Storage**: N/A — content is static, authored in a typed TypeScript content module (`lib/content.ts`); no database

**Testing**: Manual/visual validation via `quickstart.md`; Lighthouse (mobile) for performance + SEO; responsive check across breakpoints. (No unit-test framework is currently configured in the repo; none is introduced by this feature.)

**Target Platform**: Static-rendered web page served by Next.js; primary target is modern mobile browsers (Android Chrome, iOS Safari), scaling up to desktop

**Project Type**: Web application (single marketing page, front-end only)

**Performance Goals**: Above-the-fold + primary contact action usable in < 3s on a mid-range phone over typical mobile connection (SC-004); Lighthouse mobile Performance and SEO scores ≥ 90

**Constraints**: Vietnamese-only copy with correct diacritics; mobile-first, no horizontal scroll from ~320px to desktop (SC-007); contact action reachable from any scroll position (FR-012); external contact links must degrade to web fallback when app not installed (FR-011)

**Scale/Scope**: One page, 8 content sections + sticky mobile contact bar; low traffic marketing site; content maintainable without redesign (FR-016)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution (`.specify/memory/constitution.md`) is an unpopulated template with placeholder principles and no ratified rules. There are therefore **no binding governance gates** to evaluate.

Applied project-level constraints from `CLAUDE.md`/`AGENTS.md` instead:

- ✅ **Code location**: All application code changes are confined to `korean-shopping-proxy/`.
- ✅ **No app code in workspace root**: Specs/artifacts live under `specs/`; no application code is created outside the app folder.
- ✅ **Stack**: Uses the mandated Next.js + TypeScript + TailwindCSS stack already present.

**Result**: PASS (no violations; Complexity Tracking not required).

## Project Structure

### Documentation (this feature)

```text
specs/001-landing-page/
├── plan.md              # This file (/speckit-plan command output)
├── spec.md              # Feature specification (/speckit-specify)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── content-model.md #   Typed content shape each section consumes
│   └── contact-channels.md # Zalo/Kakao link + fallback contract
└── checklists/
    └── requirements.md  # Spec quality checklist (/speckit-specify)
```

### Source Code (repository root)

All work happens inside `korean-shopping-proxy/`. Target layout after this feature:

```text
korean-shopping-proxy/
├── app/
│   ├── layout.tsx            # Rebrand metadata → VyVy Order Korea; fonts; viewport
│   ├── page.tsx             # Composes the 8 sections in mandated order
│   ├── globals.css          # Tailwind v4 theme tokens (brand palette: soft pink / beige / Korea red / warm white)
│   ├── sitemap.ts           # NEW — SEO sitemap
│   └── robots.ts            # NEW — SEO robots
├── components/
│   ├── site-header.tsx      # Brand + nav (reuse/rebrand)
│   ├── hero.tsx             # §1 Hero (reuse/rebrand)
│   ├── services.tsx         # §2 Services (from features.tsx, repurposed)
│   ├── why-choose-us.tsx    # §3 Why choose us (from trust-bar.tsx/features.tsx)
│   ├── ordering-process.tsx # §4 Ordering process (from how-it-works.tsx)
│   ├── categories.tsx       # §5 Product categories (reuse/rebrand)
│   ├── testimonials.tsx     # §6 Customer reviews (reuse/rebrand)
│   ├── cta-section.tsx      # §7 Contact CTA (Zalo/Kakao)
│   ├── site-footer.tsx      # §8 Footer (reuse/rebrand)
│   ├── contact-bar.tsx      # NEW — sticky mobile Zalo/Kakao bar (FR-012)
│   └── ui/                  # shadcn primitives (button, etc.)
├── lib/
│   ├── content.ts           # NEW — single source of Vietnamese copy + data
│   ├── contact.ts           # NEW — Zalo/Kakao/phone channel config + link builders
│   └── utils.ts             # existing cn() helper
└── public/                  # brand assets, category imagery, OG image
```

Components not part of the spec's 8 sections (`pricing.tsx`, `faq.tsx`, and the standalone `trust-bar.tsx` if folded in) are removed or repurposed during implementation so the page matches FR-015 exactly.

**Structure Decision**: Reuse the existing single Next.js app (`korean-shopping-proxy/`); no new project or backend. Section components map 1:1 to the eight mandated sections; all copy/data is centralized in `lib/content.ts` and all contact destinations in `lib/contact.ts` to satisfy the "maintainable without redesign" requirement (FR-016).

## Complexity Tracking

> No constitution violations; section intentionally left empty.
