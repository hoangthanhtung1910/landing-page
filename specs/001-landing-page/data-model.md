# Phase 1 Data Model: VyVy Order Korea Landing Page

**Feature**: 001-landing-page | **Date**: 2026-07-14

This is a static, front-end-only page. There is no database; "entities" are the shapes of the typed content authored in `lib/content.ts` (+ `lib/contact.ts`) and consumed by section components. Field types are conceptual; the implementation expresses them as TypeScript interfaces.

## Entity: SiteContent (root)

The single content object the page renders from.

| Field | Type | Notes |
|-------|------|-------|
| brand | Brand | Brand identity block |
| hero | Hero | §1 content |
| services | ServiceOffering[] | §2, ≥3 items |
| trustPoints | TrustPoint[] | §3, ≥3 items |
| processSteps | ProcessStep[] | §4, ordered, ≥5 items covering link→quote→pay→purchase→ship→deliver |
| categories | ProductCategory[] | §5, MUST include cosmetics, fashion, electronics, K-pop goods |
| reviews | CustomerReview[] | §6, ≥3 items |
| cta | ContactCTA | §7 content |
| footer | Footer | §8 content |
| contact | ContactChannel[] | Shared contact destinations (see contact-channels contract) |

## Entity: Brand

| Field | Type | Validation |
|-------|------|------------|
| name | string | "VyVy Order Korea" |
| slogan | string | "Nơi gửi trọn niềm tin, mang cả Hàn Quốc đến tay bạn" — displayed prominently (FR-018) |
| tagline | string? | Optional shorter Vietnamese value proposition |
| logoAlt | string | Non-empty alt text for logo |

**Brand palette** (applied as theme tokens, not per-item content; see plan Decision 6): main = soft pink, secondary = beige, accent = Korea red, background = warm white (FR-019).

## Entity: Hero (§1)

| Field | Type | Validation |
|-------|------|------------|
| headline | string | Vietnamese; used as the single page `<h1>` |
| subheadline | string | One-line value proposition |
| primaryCta | CtaRef | Points to a ContactChannel (Zalo or Kakao) — must render above the fold (FR-004) |
| secondaryCta | CtaRef? | Optional (e.g., "Xem quy trình") anchor to process section |
| media | ImageRef? | Optional hero image with `alt` |

## Entity: ServiceOffering (§2)

| Field | Type | Validation |
|-------|------|------------|
| id | string | Stable key |
| title | string | Short Vietnamese title |
| description | string | 1–2 sentences |
| icon | string | lucide icon name |

Represents what the business does (order-on-behalf, ship Korea→Vietnam, consolidation, etc.).

## Entity: TrustPoint (§3 "Why choose us")

| Field | Type | Validation |
|-------|------|------------|
| id | string | Stable key |
| title | string | Reason-to-choose headline (e.g., minh bạch giá, hàng chính hãng) |
| description | string | Supporting sentence |
| icon | string | lucide icon name |

## Entity: ProcessStep (§4 Ordering process)

| Field | Type | Validation |
|-------|------|------------|
| order | number | 1-based sequence; unique & contiguous |
| title | string | Step name |
| description | string | What happens in this step |
| icon | string? | Optional lucide icon |

Ordered set MUST cover, in sequence: send product link/request → receive quote → confirm & pay → purchase in Korea → international shipping → delivery in Vietnam (FR-007).

## Entity: ProductCategory (§5)

| Field | Type | Validation |
|-------|------|------------|
| id | string | Stable key |
| name | string | Vietnamese category name |
| image | ImageRef | Representative image; `alt` required |
| blurb | string? | Optional one-liner |

Set MUST include at least: cosmetics (mỹ phẩm/K-beauty), fashion (thời trang), electronics (đồ điện tử), K-pop goods (FR-008).

## Entity: CustomerReview (§6)

| Field | Type | Validation |
|-------|------|------------|
| id | string | Stable key |
| name | string | Attribution (required for credibility) |
| text | string | Testimonial body |
| rating | number? | 1–5, optional; feeds JSON-LD AggregateRating when present |
| location | string? | Optional (e.g., "Hà Nội") |
| avatar | ImageRef? | Optional |

## Entity: ContactCTA (§7)

| Field | Type | Validation |
|-------|------|------------|
| headline | string | Vietnamese call to action |
| subtext | string? | Optional supporting line |
| channels | CtaRef[] | MUST include Zalo and Kakao (FR-010) |

## Entity: Footer (§8)

| Field | Type | Validation |
|-------|------|------------|
| brand | Brand | Reused brand block |
| contactSummary | string | Contact details summary |
| links | FooterLink[] | Supporting links (incl. privacy/terms placeholders) |
| socials | ContactChannel[]? | Optional social channels |
| copyright | string | Vietnamese copyright line |

## Entity: ContactChannel (shared)

See `contracts/contact-channels.md` for the full link/fallback contract.

| Field | Type | Validation |
|-------|------|------------|
| type | "zalo" \| "kakao" \| "phone" \| "email" \| "social" | Discriminator |
| label | string | Display label |
| href | string | Resolved destination (built by `lib/contact.ts`) |
| handle | string | Raw handle/number/id the business supplies |
| icon | string | Icon name |
| external | boolean | If true, render with target=_blank + rel=noopener |

## Supporting value types

- **CtaRef**: `{ label: string; channel: ContactChannel["type"] | "anchor"; target?: string }` — resolves to a contact channel or in-page anchor.
- **ImageRef**: `{ src: string; alt: string; width?: number; height?: number }` — `alt` MUST be non-empty for meaningful images (SC-006).
- **FooterLink**: `{ label: string; href: string }`.

## Cross-cutting validation rules

- All user-facing strings are Vietnamese with correct diacritics (FR-001, FR-017).
- Exactly one `<h1>` on the page (Hero.headline); all other section titles are `<h2>`/`<h3>` in logical order (SC-006).
- Every `ImageRef.alt` for a meaningful image is non-empty (SC-006).
- `contact` array MUST contain at least one `zalo` and one `kakao` channel (FR-010, FR-011).
- Section render order is fixed: Hero → Services → Why choose us → Ordering process → Product categories → Customer reviews → Contact CTA → Footer (FR-015).
