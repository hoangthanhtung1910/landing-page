# Phase 1 Data Model: VyVy Order Korea Landing Page + CMS

**Feature**: 001-landing-page | **Date**: 2026-07-14 (revised 2026-07-16 for CMS architecture)

This model backs a **NestJS + MongoDB CMS**. Content is stored as **revisions** and assembled into
**page releases**; the landing page consumes a single published release. This supersedes the original
static `lib/content.ts` model — the visitor-facing *shape* (`SiteContent`) is preserved as the public
response, but each piece is now a persisted, versioned record. Field types are conceptual; the
implementation expresses documents as Mongoose schemas and runtime-validated DTOs (TypeScript response
types live in `packages/content-types`).

## Modeling principle

Do **not** model each visual section as an independently-mutated collection. Editing produces a draft
**revision**; publishing assembles a **page release** referencing chosen published revisions and
advances a single **current-release pointer**. This yields publishing integrity (FR-033), atomic
releases (FR-034), and rollback (FR-035). There is **no separate durable last-good snapshot** — build
integrity for outages is handled by fail-closed builds (FR-030), not by a stored snapshot.

## Collections overview

| Collection | Purpose | Notes |
|-----------|---------|-------|
| `contentRevisions` | Versioned per-item content (hero, service, trust point, process step, category, review, faq item, contact channel, seo, footer, brand) | Draft + published revisions; optimistic `version` |
| `pageReleases` | Immutable published page records referencing revisions + section visibility | One per publish; retained (≥ current + previous) |
| `siteState` | Singleton: `currentReleaseId` pointer + section config/visibility working state | Atomic pointer advance on publish |
| `mediaAssets` | Uploaded media metadata + public URL | Binaries in storage adapter |
| `adminUsers` | Back-office accounts | Hashed password, enabled flag |
| `sessions` | Server-side admin sessions | For cookie-session auth + revocation |
| `auditEvents` | Content/publish action log | Who/what/when/release/before-after |

## Entity: ContentRevision

A versioned copy of one managed content item. Draft edits create new revisions without mutating
the last published one.

| Field | Type | Validation / Notes |
|-------|------|--------------------|
| _id | ObjectId | — |
| itemType | enum | `brand` \| `hero` \| `service` \| `trustPoint` \| `processStep` \| `category` \| `review` \| `faqItem` \| `contactChannel` \| `seo` \| `footer` |
| itemKey | string | Stable logical id of the item (singletons use a fixed key; list items get a generated key) |
| version | number | Optimistic-concurrency token; increments per save; stale writes rejected (409) (FR-036) |
| publishState | enum | `draft` \| `published` |
| order | number? | Display order for list items; unique & contiguous within a section |
| data | object | The item payload — shape depends on `itemType` (see "Per-item payloads") |
| createdBy / updatedBy | ObjectId (adminUsers) | Authorship (FR-037) |
| createdAt / updatedAt | date | Timestamps |

## Entity: PageRelease

An immutable, internally-consistent published page.

| Field | Type | Validation / Notes |
|-------|------|--------------------|
| _id | ObjectId | — |
| releaseNumber | number | Monotonic, unique; also exposed as the public version/ETag source |
| revisionRefs | ObjectId[] (contentRevisions) | Exact published revisions composing this release |
| sectionVisibility | object | Per optional section: `enabled: boolean` (required sections implicitly always enabled) |
| content | SiteContent | Denormalized published content for this release, for fast public reads (this IS the release's content — not a fallback snapshot) |
| publishedBy | ObjectId (adminUsers) | Publisher (FR-037) |
| publishedAt | date | — |

## Entity: SiteState (singleton)

| Field | Type | Validation / Notes |
|-------|------|--------------------|
| _id | fixed key | Single document |
| currentReleaseId | ObjectId (pageReleases)? | The live release pointer; advanced atomically on publish (FR-034) |
| previousReleaseId | ObjectId (pageReleases)? | Retained for rollback (FR-035) |
| sectionVisibilityDraft | object | Working (unpublished) per-section enable/disable state (FR-051) |

## Entity: MediaAsset

| Field | Type | Validation / Notes |
|-------|------|--------------------|
| _id | ObjectId | — |
| objectKey | string | Generated, non-guessable storage key (unique) |
| url | string | Stable **public** URL |
| mimeType | enum | Allowlisted, verified by content inspection (e.g., image/jpeg, image/png, image/webp) |
| bytes | number | ≤ configured size limit |
| width / height | number | ≤ configured dimension limits |
| alt | string | Required non-empty alt text (SC-006, FR-029) |
| uploadedBy | ObjectId (adminUsers) | Admin-only upload (FR-027) |
| createdAt | date | — |

Deletion is **reference-aware**: an asset referenced by the current release cannot be deleted; orphan
cleanup handles unreferenced assets (FR-039).

## Entity: AdminUser

| Field | Type | Validation / Notes |
|-------|------|--------------------|
| _id | ObjectId | — |
| username | string | Unique |
| passwordHash | string | bcrypt/argon2; never returned by any endpoint |
| enabled | boolean | Disabled accounts cannot authenticate (FR-038) |
| createdAt / updatedAt | date | — |

Single `administrator` role in v1 (no role field needed yet; granular roles deferred).

## Entity: Session

| Field | Type | Validation / Notes |
|-------|------|--------------------|
| _id / sessionId | string | Opaque id stored in the HttpOnly cookie |
| userId | ObjectId (adminUsers) | — |
| createdAt | date | — |
| expiresAt | date | Session expiry (FR-038) |
| revokedAt | date? | Set on logout/revocation |

## Entity: AuditEvent

| Field | Type | Validation / Notes |
|-------|------|--------------------|
| _id | ObjectId | — |
| actor | ObjectId (adminUsers) | Who |
| action | enum | e.g., `create` \| `update` \| `delete` \| `reorder` \| `publish` \| `rollback` \| `toggleSection` \| `mediaUpload` \| `mediaDelete` |
| targetType / targetId | string | Entity/revision affected |
| releaseNumber | number? | Resulting release when applicable |
| before / after | object? | Before/after reference sufficient to answer "what changed" (FR-037) |
| createdAt | date | — |

## Public response shape: SiteContent (aggregated release)

The public endpoint returns one release as `SiteContent`. Optional sections appear only when enabled;
`meta` carries the version so consumers can identify the exact release.

| Field | Type | Notes |
|-------|------|-------|
| meta | `{ releaseNumber: number; publishedAt: string }` | Powers ETag/version (FR-023) |
| brand | Brand | Always present |
| hero | Hero | **Required** section §1 |
| services | ServiceOffering[]? | Optional §2 (present only if enabled) |
| trustPoints | TrustPoint[]? | Optional §3 |
| processSteps | ProcessStep[]? | Optional §4, ordered |
| categories | ProductCategory[]? | Optional §5, MUST include cosmetics/fashion/electronics/K-pop when present |
| reviews | CustomerReview[]? | Optional §6; empty/omitted when no approved reviews (never fabricated) |
| faq | FaqItem[]? | Optional (new); between reviews and CTA |
| cta | ContactCTA | **Required** §7 |
| footer | Footer | **Required** §8 |
| contact | ContactChannel[] | Shared; MUST include ≥1 zalo and ≥1 kakao; **each `type` appears at most once** so a `CtaRef` resolves deterministically (INV-10; see contact-channels contract) |
| seo | Seo | Page-level SEO metadata |

## Per-item payloads (`ContentRevision.data` by `itemType`)

### Brand
| Field | Type | Validation |
|-------|------|------------|
| name | string | "VyVy Order Korea" |
| slogan | string | "Nơi gửi trọn niềm tin, mang cả Hàn Quốc đến tay bạn" (FR-018) |
| tagline | string? | Optional shorter Vietnamese value proposition |
| logo | ImageRef? | Non-empty `alt` |

Brand palette (soft pink / beige / Korea red / warm white) is applied as theme tokens, not per-item
content (FR-019).

### Hero (§1, required)
| Field | Type | Validation |
|-------|------|------------|
| headline | string | Vietnamese; rendered as the single `<h1>` |
| subheadline | string | One-line value proposition |
| primaryCta | CtaRef | MUST be a **contact-channel CTA** (never an anchor) whose channel type exists in `contact` — the functional primary contact action, above the fold (FR-004) |
| secondaryCta | CtaRef? | Optional: a valid anchor CTA, or a contact-channel CTA whose type exists in `contact` |
| media | ImageRef? | Optional; `alt` required |

### ServiceOffering (§2) / TrustPoint (§3)
| Field | Type | Validation |
|-------|------|------------|
| title | string | Short Vietnamese title |
| description | string | 1–2 sentences |
| icon | string | lucide icon name |

### ProcessStep (§4)
| Field | Type | Validation |
|-------|------|------------|
| order | number | 1-based, unique & contiguous |
| title | string | Step name |
| description | string | What happens |
| icon | string? | Optional |

Ordered set, when present, covers: send product link/request → receive quote → confirm & pay →
purchase in Korea → international shipping → delivery in Vietnam (FR-007).

### ProductCategory (§5)
| Field | Type | Validation |
|-------|------|------------|
| name | string | Vietnamese category name |
| image | ImageRef | `alt` required |
| blurb | string? | Optional one-liner |

When enabled, MUST include cosmetics, fashion, electronics, K-pop goods (FR-008).

### CustomerReview (§6)
| Field | Type | Validation |
|-------|------|------------|
| name | string | Attribution |
| text | string | Testimonial body |
| rating | number? | 1–5; feeds AggregateRating only when eligible real reviews exist |
| location | string? | Optional |
| avatar | ImageRef? | Optional |
| approved | boolean | MUST be true to display; consent recorded (FR-043) |

### FaqItem (new optional section)
| Field | Type | Validation |
|-------|------|------------|
| order | number | Display order |
| question | string | Vietnamese |
| answer | string | Vietnamese |

### ContactCTA (§7, required)
| Field | Type | Validation |
|-------|------|------------|
| headline | string | Vietnamese call to action |
| subtext | string? | Optional |
| channels | CtaRef[] | **Contact-only** (anchor entries not allowed); every entry MUST reference a channel type configured in `contact`; MUST include Zalo and Kakao (FR-010) |

### Footer (§8, required)
| Field | Type | Validation |
|-------|------|------------|
| contactSummary | string | Contact details summary |
| links | FooterLink[] | Supporting links (incl. privacy/terms placeholders) |
| socials | ContactChannel[]? | Optional |
| copyright | string | Vietnamese copyright line |

### ContactChannel (shared)
See `contracts/contact-channels.md`.
| Field | Type | Validation |
|-------|------|------------|
| type | `zalo`\|`kakao`\|`messenger`\|`phone`\|`email`\|`social` | Discriminator; **unique across `content.contact`** (INV-10) — a `CtaRef` identifies its destination by `type` alone |
| label | string | Display label; non-empty |
| handle | string | Raw handle/number/id the business supplies; **non-empty and valid for the channel `type`** (published content never carries an empty/malformed handle) |
| icon | string | Icon name; non-empty |
| external | boolean | If true, `target=_blank` + `rel=noopener` |

**No stored/public `href`.** The shared public schema has no `href` field; the link is **derived at
render time** by `apps/web/lib/contact.ts` from `type` + `handle` (a non-persisted view value). Admin
DTOs MUST NOT reintroduce a persisted `href`.

### Seo (page-level)
| Field | Type | Validation |
|-------|------|------------|
| title | string | Unique, descriptive, Vietnamese |
| description | string | Meta description |
| canonical | string? | Canonical URL |
| ogImage | ImageRef? | Social-share image (static fallback if unset) |
| ogFields / twitterFields | object? | Open Graph / Twitter metadata |

## Supporting value types

- **CtaRef** — a **discriminated union** on `channel` (matches the shared Zod schema):
  - Anchor CTA: `{ label: string; channel: "anchor"; target: string }` — `target` is REQUIRED and
    restricted to an in-page anchor (`#id`) or a safe site-relative path (never an arbitrary URL/scheme).
  - Contact CTA: `{ label: string; channel: ContactChannel["type"] }` — NO `target` key (providing one
    fails strict validation); the destination is always derived from the referenced contact channel.
  - **Cross-field integrity** (enforced in `siteContentSchema` and reused by the T029 publish
    validator): every non-anchor CTA's channel type MUST exist in `content.contact`; each channel
    `type` appears **at most once** in `content.contact` so the lookup is deterministic (INV-10,
    reported at `contact.<index>.type`); the Hero primaryCta MUST be a contact CTA; the dedicated
    Contact-CTA section is contact-only and MUST reference both Zalo and Kakao.
- **ImageRef**: `{ src: string; alt: string; width?: number; height?: number }` — `alt` non-empty for
  meaningful images (SC-006).
- **FooterLink**: `{ label: string; href: string }`.

## Indexes & uniqueness constraints

- `contentRevisions`: index on `{ itemType, itemKey, version }`; index on `{ itemType, publishState }`.
- `pageReleases`: unique index on `releaseNumber` (monotonic).
- `siteState`: single-document (fixed `_id`); pointer advance is atomic.
- `mediaAssets`: unique index on `objectKey`.
- `adminUsers`: unique index on `username`.
- `sessions`: index on `sessionId` (unique) and `expiresAt` (TTL-style expiry).
- `auditEvents`: index on `{ createdAt }` and `{ actor }`.

## Cross-cutting validation rules

- All user-facing strings are Vietnamese with correct diacritics (FR-001, FR-017).
- Exactly one `<h1>` on the page (Hero.headline); other titles `<h2>`/`<h3>` in logical order (SC-006).
- Every `ImageRef.alt` for a meaningful image is non-empty (SC-006).
- `contact` MUST contain ≥1 `zalo` and ≥1 `kakao` (FR-010, FR-011).
- Required sections (Hero, Contact CTA, Footer) are always present; optional sections appear only when
  enabled; disabled optional sections are omitted from the release; enabled-but-empty sections render a
  defined honest empty state (FR-015, FR-040, FR-041, FR-051).
- Reviews display only when `approved` is true; empty/absent otherwise — never fabricated (FR-043).
- Publishing validates the full candidate page before advancing the release pointer (FR-034).
