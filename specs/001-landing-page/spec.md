# Feature Specification: VyVy Order Korea Landing Page + Content Management System

**Feature Branch**: `001-landing-page`

**Created**: 2026-07-14

**Last Revised**: 2026-07-14 (architecture change — added CMS backend)

**Status**: Draft (revised)

**Input**: User description: "Create a landing page for a Korea-Vietnam shopping order and shipping service. Brand: VyVy Order Korea. Business: Help Vietnamese customers buy Korean products and ship from Korea to Vietnam. Target customers: Vietnamese people who love Korean products; customers buying cosmetics, fashion, electronics, K-pop goods. Main goals: increase customer trust, get customers contacting via Zalo/Kakao, explain ordering process clearly. Requirements: Vietnamese language, mobile first, Korean premium style, SEO optimized. Sections: Hero, Services, Why choose us, Ordering process, Product categories, Customer reviews, Contact CTA, Footer."

**Revision input**: "Build a CMS backend to manage landing page content. Add a backend content-management API and an admin dashboard to manage every landing-page section (hero, services, why-choose-us/trust, ordering process, product categories, reviews, contact info, SEO metadata, media/images). Keep the existing Next.js landing page but replace its static content source with API-based content fetching, keeping it mobile-first and SEO optimized. Target architecture: Admin Dashboard → CMS API → database → Next.js Landing Page."

## Architecture Overview *(revised)*

Originally this feature was a single static landing page whose content lived in a local file. It is now a **three-tier, content-managed system**:

```text
Admin Dashboard ──▶ CMS Content API ──▶ Database
                                          │
                          published content│(read)
                                          ▼
                                  Next.js Landing Page ──▶ Visitor
```

- **Content administrators** create and edit landing-page content through an **admin dashboard** that talks to a **content-management API** (the "CMS").
- The CMS persists content and exposes a **public read endpoint** for published content.
- The **Next.js landing page** fetches published content from the public endpoint (at build/regeneration time so pages stay pre-rendered) instead of reading a static local file, preserving mobile-first performance and SEO.

This spec now covers **two audiences**: end **visitors** (unchanged visitor value) and internal **content administrators** (new). Requirements are written to remain implementation-agnostic; concrete technology choices (NestJS, MongoDB, etc.) live in `plan.md`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visitor decides to make contact (Priority: P1)

A Vietnamese shopper who loves Korean products lands on the page (often from a phone, via a social ad or search result). Within seconds they understand what VyVy Order Korea does, feel the service is trustworthy, and tap a Zalo or Kakao button to start a conversation about ordering.

**Why this priority**: Contact conversion is the single business outcome that pays for the page. Everything else (trust, clarity) exists to move the visitor toward tapping a contact button. If only this works, the business still gets leads.

**Independent Test**: Load the page on a mobile device, confirm the hero communicates the service and displays a working Zalo/Kakao contact action (rendered from CMS-published content), and confirm at least one contact action is reachable from every screen position (persistent or repeated). Tapping it opens the correct external contact channel.

**Acceptance Scenarios**:

1. **Given** a visitor opens the page on a mobile phone, **When** the hero renders, **Then** they see the brand name, a one-line value proposition in Vietnamese, and a primary contact call-to-action above the fold.
2. **Given** a visitor has scrolled to any section, **When** they decide to act, **Then** a contact action (Zalo and/or Kakao) is reachable without scrolling back to the top.
3. **Given** a visitor taps the Zalo contact action, **When** the action fires, **Then** the visitor is taken to the business's Zalo contact channel; **And** tapping the Kakao action opens the business's Kakao channel.

---

### User Story 2 - Content administrator manages landing-page content (Priority: P2)

A non-developer staff member at VyVy Order Korea logs into an admin dashboard and edits the landing page's content — updating the hero copy/slogan, adding a new service or trust point, reordering the ordering-process steps, adding a product category, publishing a new customer review, changing the Zalo/Kakao contact details, editing SEO metadata, and uploading images — then publishes the changes so they appear on the live landing page, all without touching code or redeploying by hand.

**Why this priority**: This is the core new capability of the revised architecture. It converts the site from a developer-edited artifact into a self-service, business-managed one, and it is the prerequisite that lets non-technical staff keep every visitor-facing section (US1, US3, US4) accurate over time. It ranks just below the primary conversion path because the page must first exist and convert; but it is the reason for this initiative.

**Independent Test**: Authenticate to the admin dashboard, create/edit/reorder/delete items in each managed section (hero, services, trust points, process steps, categories, reviews, contact info, SEO metadata, media), publish, and confirm the public content endpoint returns the updated published content and the landing page reflects it after regeneration.

**Acceptance Scenarios**:

1. **Given** an authenticated administrator, **When** they edit a section (e.g., change the hero headline or add a customer review) and publish, **Then** the change is persisted and returned by the public published-content endpoint.
2. **Given** an unauthenticated request to any admin (write) endpoint, **When** it is made, **Then** it is rejected (no unauthorized content changes are possible).
3. **Given** an administrator uploads an image for a category or review, **When** the upload succeeds, **Then** the image is stored and referenced by a stable URL usable by the landing page.
4. **Given** an administrator saves invalid content (e.g., a required field missing, or an out-of-range rating), **When** they submit, **Then** the change is rejected with a clear validation error and the live content is unchanged.
5. **Given** an administrator saves a section as a draft (not published), **When** the landing page fetches published content, **Then** the draft does not appear publicly until it is published.

---

### User Story 3 - Visitor understands the ordering process (Priority: P3)

A first-time visitor is unsure how a "buy-for-me" proxy service works. They read the ordering-process section and come away understanding the steps from sending a product link to receiving the parcel in Vietnam, which removes hesitation before contacting.

**Why this priority**: Process confusion is the biggest objection for proxy-buying services. Clear steps directly increase the quality and volume of contacts driven by User Story 1.

**Independent Test**: Load the page and confirm the ordering-process section presents a clear, ordered sequence of steps in Vietnamese (sourced from the CMS) that a new visitor can follow end-to-end without external explanation.

**Acceptance Scenarios**:

1. **Given** a visitor reaches the ordering-process section, **When** it renders, **Then** they see numbered/sequential steps covering: sending the product link/request, receiving a quote, confirming and paying, purchase in Korea, international shipping, and delivery in Vietnam.
2. **Given** a visitor finishes reading the process, **When** they reach the end of the section, **Then** a contact call-to-action invites them to start an order.

---

### User Story 4 - Visitor builds trust and explores what can be bought (Priority: P4)

A cautious visitor wants reassurance before contacting a stranger with their money. They read the "why choose us" points, browse the product categories they care about (cosmetics, fashion, electronics, K-pop goods), and see reviews from prior customers, which raises confidence enough to reach out.

**Why this priority**: Trust and relevance amplify conversion but are supporting content; the page still functions for decided visitors without them. They lift the contact rate rather than enable it.

**Independent Test**: Load the page and confirm the "why choose us", product categories, and customer reviews sections each render with relevant Vietnamese content and that product categories clearly include cosmetics, fashion, electronics, and K-pop goods. Reviews shown are approved, real (or consented) testimonials; if none are approved yet, the reviews section shows an honest empty state rather than invented customers.

**Acceptance Scenarios**:

1. **Given** a visitor reaches the "why choose us" section, **When** it renders, **Then** they see distinct trust-building reasons (e.g., transparent pricing, genuine products, order tracking, support).
2. **Given** a visitor reaches the product categories section, **When** it renders, **Then** they see at least the categories cosmetics, fashion, electronics, and K-pop goods, each visually distinguishable.
3. **Given** approved customer testimonials exist, **When** the reviews section renders, **Then** the visitor sees multiple real (or consented) testimonials attributed to a name (and optionally rating), presented as credible social proof; **And Given** no approved testimonials exist, **When** the section renders, **Then** it shows an honest empty state and never fabricates customers or ratings.

---

### Edge Cases

- **No content yet**: When a managed section (e.g., reviews or categories) has no approved published items, that section renders a deterministic honest empty state (per FR-041) — it never fabricates testimonials or presents invented data as real customers, and never shows a broken/empty layout.
- **Slow or metered mobile connection**: On a slow 3G/4G connection the page's above-the-fold content and primary contact action become usable before all imagery finishes loading.
- **Contact app not installed**: When a visitor taps Zalo/Kakao without the app installed, the action still resolves to a usable fallback (web/profile page) rather than a dead link.
- **Very small and very large screens**: Layout remains readable and tappable from small phones up to desktop widths without horizontal scrolling or overlapping elements.
- **Accessibility**: Text remains legible at increased system font sizes, and interactive elements meet minimum tap-target sizing; content is reachable by keyboard with visible focus (per FR-042).
- **Diacritics/encoding**: Vietnamese diacritics render correctly across all copy.
- **CMS/API unavailable**: If the content API cannot be reached (or returns a malformed/partial response) during a build, the build/deployment fails rather than promoting an empty/broken page to production (fail-closed). At runtime, a page that already built successfully keeps serving via Next.js ISR defaults if a later background revalidation fails. No custom snapshot/last-good fallback is built (per FR-030).
- **Publishing integrity while editing**: While an administrator edits a published item as a draft, the currently-live page continues to show the previous published version unchanged until an explicit, successful, page-level publish (per FR-033, FR-034).
- **Partial/failed publish**: If publishing a candidate release fails validation or errors mid-way, the prior published release remains live and internally consistent; visitors never see a page assembled from parts of different editorial releases (per FR-034).
- **Empty/partial content at publish time**: If a required section has no publishable content, publication is blocked or the section falls back to its defined empty state (per FR-041) rather than producing a broken release.
- **Concurrent admin edits**: When two administrators edit the same item, optimistic concurrency (a version/revision identifier) detects the stale edit and returns a conflict the dashboard can explain and resolve — silent last-write-wins overwrite is not permitted (per FR-036).
- **Unauthorized access**: Admin write endpoints reject unauthenticated or unauthorized requests; the public read endpoint exposes only published content (never drafts or admin-only fields).

## Brand Identity

The page MUST express a consistent brand identity across all sections.

- **Name**: VyVy Order Korea
- **Slogan**: "Nơi gửi trọn niềm tin, mang cả Hàn Quốc đến tay bạn"
- **Personality / style**: Korean lifestyle; friendly; trustworthy; premium but approachable. The design should feel welcoming and warm rather than cold/luxury-austere, while still reading as polished and high-quality.
- **Color palette**:
  - **Main**: soft pink — the dominant brand color, used for primary emphasis (headlines accents, primary buttons/CTAs, key highlights).
  - **Secondary**: beige — supporting surfaces, section backgrounds, and cards.
  - **Accent**: Korea red — reserved for high-emphasis moments (e.g., the primary contact call-to-action, badges, small highlights) to draw the eye and evoke Korean branding.
  - **Background**: warm white — the base page background, giving generous, airy whitespace.
- **Palette usage intent**: soft pink + warm white + beige carry the friendly, approachable premium feel; Korea red is used sparingly as a deliberate accent so it stays impactful and the contact actions stand out.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The page MUST present all visitor-facing copy in Vietnamese.
- **FR-002**: The page MUST be designed mobile-first, remaining fully usable and readable on phone-sized screens and scaling up gracefully to tablet and desktop widths.
- **FR-003**: The page MUST convey a premium, Korean-inspired visual style consistent with the "VyVy Order Korea" brand identity (see Brand Identity section) — friendly, trustworthy, and premium-but-approachable, evoking a Korean lifestyle feel.
- **FR-004**: The page MUST include a hero section showing the brand name, a concise Vietnamese value proposition, and a primary contact call-to-action above the fold.
- **FR-005**: The page MUST include a services section describing what VyVy Order Korea does (buying Korean products on the customer's behalf and shipping them from Korea to Vietnam).
- **FR-006**: The page MUST include a "why choose us" section presenting distinct trust-building reasons to use the service.
- **FR-007**: The page MUST include an ordering-process section that explains the end-to-end steps in a clear, sequential order understandable to a first-time visitor.
- **FR-008**: The page MUST include a product-categories section that presents at least cosmetics, fashion, electronics, and K-pop goods as distinguishable categories.
- **FR-009**: The customer-reviews section (an optional section, FR-015) — when enabled and approved testimonials exist — MUST present multiple genuine/consented testimonials as social proof; when enabled with no approved testimonials it MUST render the defined honest empty state (FR-041, FR-043), and it MAY be disabled entirely by an administrator. The page MUST NOT fabricate testimonials to satisfy this requirement.
- **FR-010**: The page MUST include a prominent contact call-to-action section offering Zalo and Kakao as contact channels.
- **FR-011**: Contact actions MUST link to the business's actual Zalo and Kakao channels and open the appropriate channel when activated, with a usable fallback when the corresponding app is unavailable.
- **FR-012**: A contact action MUST be reachable from any scroll position on the page on **all supported layouts** — a sticky/persistent contact affordance on mobile AND a sticky header or floating contact affordance on desktop (not solely non-sticky header CTAs) — so a decided visitor never has to hunt for how to make contact. This MUST be verified per viewport (mobile and desktop).
- **FR-013**: The page MUST include a footer with brand identity, contact details, and supporting links appropriate to a business landing page.
- **FR-014**: The page MUST be optimized for search engines, including a descriptive page title, meta description, semantic heading structure, descriptive image alternate text, and social-share preview metadata, all in Vietnamese and relevant to Korea–Vietnam shopping/proxy keywords.
- **FR-015**: The page uses a **hybrid section model**. **Required sections** — Hero, Contact CTA, and Footer — MUST always be present on every published page and cannot be disabled. **Optional sections** — Services, Why choose us, Ordering process, Product categories, Customer reviews, and FAQ — MAY be individually enabled or disabled by an administrator (FR-040). When sections are rendered, they MUST appear in this relative order: Hero, Services, Why choose us, Ordering process, Product categories, Customer reviews, FAQ, Contact CTA, Footer — disabled optional sections are omitted, and the required sections keep their positions (Hero first; Contact CTA then Footer last). The page-release validator MUST treat the three required sections as mandatory and the optional sections as conditional on their enabled state.
- **FR-016**: All content that changes over time (hero copy, services, trust points, process steps, categories, reviews, contact details, SEO metadata, images) MUST be maintainable by non-developers through the CMS admin dashboard, without code changes or a visitor-facing redesign.
- **FR-017**: The page MUST render correctly with Vietnamese diacritics and remain legible when the visitor increases their device/system font size.
- **FR-018**: The page MUST display the brand slogan "Nơi gửi trọn niềm tin, mang cả Hàn Quốc đến tay bạn" prominently (e.g., in the hero and/or footer) as part of the brand messaging.
- **FR-019**: The page MUST apply the brand color palette consistently: soft pink as the main color, beige as the secondary color, Korea red as a sparingly-used accent (notably for the primary contact call-to-action), and warm white as the page background — while maintaining sufficient text contrast for legibility.
- **FR-020**: The page's tone and visual treatment MUST reflect the brand personality — friendly, trustworthy, and premium-but-approachable — avoiding both a cold/austere luxury look and a cheap/cluttered look.

#### Content Management (CMS) requirements *(revised architecture)*

- **FR-021**: The system MUST provide a content-management backend (CMS) that persists all landing-page content in a database.
- **FR-022**: The CMS MUST expose an admin API that lets authenticated administrators create, read, update, delete, and reorder content for each managed content type: hero, services, trust points (why choose us), ordering-process steps, product categories, customer reviews, FAQ items, contact information, SEO metadata, and media/images. For optional sections (FR-015/FR-040) it MUST also let administrators enable/disable the section.
- **FR-023**: The CMS MUST expose a public read endpoint that returns a single **internally consistent published page release** (all sections from the same editorial release), containing only published content and excluding drafts and admin-only fields. The response MUST carry a release/version identifier so consumers can identify the exact published version.
- **FR-024**: The landing page MUST obtain all of its content from the CMS public endpoint instead of a static local file, and MUST render as pre-generated/server-rendered HTML (not client-only fetching) so mobile performance and SEO are preserved (supports SC-004, SC-006).
- **FR-025**: Admin (write) endpoints MUST require authentication and reject unauthenticated or unauthorized requests; only authorized administrators may change content. **Authentication uses cookie-based admin sessions**: an `HttpOnly` session cookie, marked `Secure` in production, with `SameSite` protection, paired with CSRF protection on state-changing requests and a CORS configuration restricted to the known admin/web origins. This is admin authentication only (no visitor/public login). Bearer/JWT-in-JS storage is NOT used.
- **FR-026**: The CMS MUST use a revision-based draft/publish model: an administrator can edit content as a working draft while the previously published revision remains live and unchanged, and the draft becomes public only through an explicit publish. Changing an item to "draft" MUST NOT silently remove the live version before a new release is published.
- **FR-027**: Only authenticated administrators MAY upload, update, or delete media/images. Each stored asset MUST return a **stable public URL** that the landing page and any visitor can read (media that backs published content is public). Media metadata MUST be stored in the database. Media handling MUST validate file type by content inspection (allowed MIME types only), enforce file-size and dimension limits, generate non-guessable object keys, and support reference-aware deletion (see FR-039 for the full media-security requirement).
- **FR-028**: The CMS MUST allow administrators to manage SEO metadata (page title, meta description, social-share/Open Graph fields) that the landing page applies to its rendered output.
- **FR-029**: The CMS MUST validate content on write (required fields, field formats, rating ranges, ordered-step sequence, presence of image alt text) and reject invalid content with a clear error, leaving previously published content unchanged.
- **FR-030**: The landing page renders from the CMS public API at build/regeneration time. Build/deploy is **fail-closed**: if the CMS API is unreachable or returns no valid published content during a build, the build/deployment MUST fail rather than promote an empty or broken page to production. At runtime the site MAY rely on Next.js's default ISR behavior (a failed background revalidation keeps serving the last successfully generated page) — **no custom durable snapshot, last-good file, snapshot collection, or bespoke fallback mechanism is built**. A generation-time fetch MUST have a bounded timeout and MUST reject malformed/partial responses (treated as a failed fetch, not a valid page).
- **FR-031**: Published content changes MUST become visible on the landing page through a defined refresh mechanism (e.g., regeneration/revalidation or on-publish trigger) within a bounded, documented time window, without a manual code deploy. The concrete SLA, retry, and observability requirements for this mechanism are specified in **FR-048** (which this requirement defers to for detail — the two are one mechanism, not two).
- **FR-032**: The admin dashboard MUST let a non-developer perform all content operations in FR-022 through a UI (forms/lists), including reordering items and toggling publish state, and MUST present explicit loading, empty, unauthorized, validation-error, network-failure, stale-edit/conflict, unsaved-change, and publish-failure states with accessible error messaging and safe retry — so an administrator never loses work or believes failed content was published.

#### Publishing, integrity & governance requirements *(added per architecture review)*

- **FR-033**: **Publishing integrity** — Editing a published item MUST NOT alter or remove the currently public version before an explicit, successful publish of that content.
- **FR-034**: **Atomic release** — Publication MUST validate the complete candidate page and switch a page-level published-release pointer atomically. A failed publication MUST leave the prior release entirely unchanged; a visitor MUST always receive one internally consistent published page version (never a mix of editorial releases).
- **FR-035**: **Rollback / recovery** — The system MUST retain at least the current and immediately previous published releases and support reverting the live page to the previous published release. (Full long-term revision browsing MAY be deferred; recovery of the last-known-good release MUST NOT.)
- **FR-036**: **Concurrency control** — The CMS MUST use optimistic concurrency via a version/revision identifier: a save against a stale version MUST be rejected with a conflict (not silently overwritten), and the dashboard MUST surface the conflict for resolution.
- **FR-037**: **Auditability** — The system MUST record, for each content change and publish action, the administrator identity, action, entity/revision, timestamp, resulting release, and a before/after reference sufficient to answer "who changed what, when."
- **FR-038**: **Authentication lifecycle** — Building on the cookie-session model (FR-025), the system MUST define and implement session expiry, logout/revocation (invalidating the server-side session), secure password hashing, initial-credential provisioning and rotation, account disabling, and login throttling/rate limiting. Security-relevant auth events MUST be logged.
- **FR-039**: **Media security** — Upload/update/delete are restricted to authenticated administrators (FR-027); public read access is allowed for stored assets. The CMS MUST restrict uploads to an allowlist of MIME types verified by content inspection, enforce size and dimension limits, and store assets under generated object keys behind a **storage abstraction** — a local adapter for development and a design ready for S3/CDN migration — with **public** delivery URLs (no signed-URL requirement for v1). It MUST prevent deletion of assets still referenced by published content, and support orphan cleanup and backup/retention. Next.js remote-image origins MUST be configured to match the media origin.
- **FR-040**: **Section governance (v1 scope)** — The section types and their relative order (FR-015) are fixed for v1. Administrators MAY enable/disable each **optional** section (Services, Why choose us, Ordering process, Product categories, Customer reviews, FAQ) and reorder items within a section; the three **required** sections (Hero, Contact CTA, Footer) cannot be disabled. Adding arbitrary new section types or free-form whole-page composition is out of scope for v1.
- **FR-041**: **Deterministic empty & disabled states** — Behavior when a section has no publishable content MUST be defined and testable: a **required** section with no content renders a defined honest empty state (it is never fabricated and never removed); an **optional** section with no content is either disabled/omitted by the administrator or renders its defined honest empty state. A disabled optional section is omitted from the published release entirely. Invented content MUST NOT be presented as real (see FR-043).
- **FR-042**: **Accessibility baseline** — Beyond font-size legibility and tap-target sizing, the public page MUST provide full keyboard access, visible focus indicators, correct labels/landmarks, sufficient color contrast, and accessible error messaging; the admin dashboard MUST meet the same interaction-accessibility baseline for its forms.
- **FR-043**: **Content authenticity & consent** — Testimonials presented as real customers MUST be approved and, where they include a person's name, location, avatar, text, or rating, have appropriate consent. Rating/`AggregateRating` structured data MUST be emitted only when eligible real reviews exist. Placeholder/seed content MUST be clearly non-production and blocked by the launch gate (FR-045).
- **FR-044**: **Conversion analytics** — Activation of each contact CTA (Zalo/Kakao) MUST emit an analytics event carrying the channel and CTA placement (hero, sticky bar, process CTA, dedicated CTA, header, footer), with defined privacy/consent behavior, so SC-001 is measurable.
- **FR-045**: **Production launch gate** — Before production launch the system MUST require: verified real Zalo/Kakao/phone contact destinations, approved genuine testimonials (or an honest empty state), the final canonical domain, real brand assets, finalized SEO content, and named business approval. Launch MUST NOT proceed on placeholder contact or invented reviews.
- **FR-046**: **Content migration & parity** — Existing static landing-page content MUST be seeded/imported into the CMS and the CMS-rendered page compared against the prior static output for parity before the static content source is removed.
- **FR-047**: **API compatibility** — The public and admin API contracts MUST be versioned and stable; breaking changes MUST be introduced through explicit versioning so the API, admin dashboard, and public site do not drift.
- **FR-048**: **Public refresh SLA & resilience** — Published changes MUST become visible within a documented bound (target under 5 minutes) via on-demand invalidation with periodic safety revalidation; failed invalidation triggers MUST be retried, and publish-to-live latency and failures MUST be observable. On invalidation failure the administrator MUST see a clear status rather than a false success.
- **FR-049**: **Operational resilience** — The platform MUST provide health/readiness checks, structured logging, monitoring/alerting on publication and availability failures, database and media backups, and a tested restore path.
- **FR-050**: **FAQ section** — The CMS MUST manage an optional FAQ section as an ordered list of question/answer items in Vietnamese; when enabled it renders between Customer reviews and Contact CTA (FR-015), and when disabled or empty it follows the optional-section rules (FR-040/FR-041).
- **FR-051**: **Section visibility state** — Each optional section MUST carry an administrator-controlled enabled/disabled state persisted in the CMS and reflected in the published release; the public read endpoint MUST omit disabled sections and MUST never expose visibility of unpublished/disabled content.

### Key Entities *(include if feature involves data)*

- **Service offering**: A described capability of the business (e.g., "order on your behalf", "ship Korea→Vietnam"), with a short title and description used in the services section.
- **Process step**: An ordered step in the buy-and-ship journey, with a sequence position, title, and short description.
- **Product category**: A shopping category the service supports (cosmetics, fashion, electronics, K-pop goods, and any others), with a name and representative imagery/icon.
- **Customer review**: A testimonial with attribution (customer name), review text, and optional rating and location.
- **Contact channel**: A way to reach the business (Zalo, Kakao, and any supporting phone/social), with a channel type and its destination/handle.
- **Trust point**: A single reason-to-choose statement with a short title and description used in the "why choose us" section.
- **FAQ item**: A question/answer pair (Vietnamese) with a display order, used in the optional FAQ section.
- **Section visibility**: The per-section enabled/disabled state for optional sections (Services, Why choose us, Ordering process, Product categories, Customer reviews, FAQ), controlling whether the section appears in the published release (FR-040, FR-051). Required sections (Hero, Contact CTA, Footer) have no disable state.

Each content entity above is now a **persisted, managed record** in the CMS (not a hardcoded value), typically carrying: a stable identifier, a display order (where the section is a list), a publish state (draft/published), and created/updated timestamps. Additional CMS-specific entities:

- **Hero content**: The single hero record — headline, subheadline/value proposition, slogan, primary/secondary call-to-action references, optional hero media.
- **Contact information**: The managed set of contact channels (Zalo, Kakao, phone, email, socials) with their handles/destinations; edited by administrators.
- **SEO metadata**: Managed page-level SEO fields — title, meta description, canonical, Open Graph/Twitter fields, and social-share image reference.
- **Media asset**: An uploaded image managed by the CMS — stored binary/reference, stable public URL, alt text, and optional dimensions; referenced by categories, reviews, hero, and SEO.
- **Administrator (admin user)**: An authenticated back-office user permitted to manage content; carries credentials/identity (securely hashed), account status (enabled/disabled), and authorization to access admin endpoints under the single v1 administrator role.
- **Content revision**: A versioned copy of a managed item carrying a version/revision identifier (for optimistic concurrency, FR-036), a draft-or-published marker, and authorship/timestamps. Editing produces a new working draft without mutating the last published revision.
- **Page release**: A page-level, internally consistent published record referencing the exact published revisions of every section, with a monotonic release/version identifier. The public endpoint serves the current release; the previous release is retained for rollback (FR-034, FR-035). Publishing atomically advances the current-release pointer. (This is the released content itself — not a fallback/last-good snapshot.)
- **Audit event**: A record of an administrative action — administrator, action, target entity/revision, timestamp, resulting release, and before/after reference (FR-037).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 8% of visitors who reach the page tap a contact call-to-action (Zalo or Kakao).
- **SC-002**: A first-time visitor can locate a working contact action within 10 seconds of the page loading on a mobile device.
- **SC-003**: A first-time visitor can correctly describe the ordering process (from sending a product link to receiving the parcel) after reading the ordering-process section, in a 5-person comprehension check, with at least 4 of 5 succeeding.
- **SC-004**: The above-the-fold content and primary contact action become usable in under 3 seconds on a representative mid-range phone over a typical mobile connection.
- **SC-005**: The page is rated "trustworthy / would consider using" by at least 80% of a small target-audience test panel (Vietnamese shoppers of Korean products).
- **SC-006**: The page achieves a strong technical SEO baseline: a unique descriptive title and meta description, a single top-level heading with a logical heading hierarchy, alternate text on all meaningful images, and valid social-share preview metadata — verified by a standard site auditing check with no critical issues.
- **SC-007**: The layout produces no horizontal scrolling or overlapping/clipped content across common screen widths from small phones (~320px) to desktop.
- **SC-008**: A non-developer administrator can update any managed section and publish it, and the change is reflected on the live landing page within the documented refresh window (target: under 5 minutes) without any code deploy.
- **SC-009**: An administrator can complete a typical content edit (e.g., add a customer review or change the hero headline) end-to-end through the dashboard in under 3 minutes.
- **SC-010**: 100% of admin write endpoints reject unauthenticated requests, and the public read endpoint never returns draft or admin-only content — verified by a security/access check.
- **SC-011**: The public content endpoint returns published content quickly enough that landing-page generation is not degraded (target: p95 under 500 ms for the content read), and the landing page continues to meet SC-004 and SC-006 while sourcing content from the CMS.
- **SC-012**: Production never serves an empty/broken page: when the CMS/API is unreachable or returns no valid content during a build, the build/deployment fails (is not promoted) in 100% of trials; a build only succeeds when it fetched valid published content. At runtime, a page that built successfully continues to serve via Next.js ISR defaults even if a later background revalidation fails.
- **SC-013**: Editing and re-publishing never exposes a partially-updated page: in publish-integrity tests, the live page always reflects exactly one release, and a failed/aborted publish leaves the prior release live in 100% of trials.
- **SC-014**: Two administrators editing the same item concurrently never silently lose work: the stale save is rejected with a conflict in 100% of trials (SC for FR-036).
- **SC-015**: Every content change and publish action is attributable to an administrator via the audit log (100% of sampled actions traceable — who/what/when/release).
- **SC-016**: Contact-CTA taps emit analytics events tagged with channel and placement, making SC-001 measurable; instrumentation is verified before launch and each of the six CTA placements is distinguishable in reporting.
- **SC-017**: The production launch gate passes only with verified real contact destinations and approved genuine testimonials (or an honest empty state) — zero placeholder contact links or invented reviews reach production.
- **SC-018**: CMS-rendered content matches the migrated static content in a pre-cutover parity check before the static source is removed.
- **SC-019**: Authentication lifecycle behaves securely: expired/revoked sessions are rejected, repeated failed logins are throttled, and disabled accounts cannot authenticate — verified by automated tests.

- The page is a single-page marketing landing page (no on-site checkout or account system); the intended conversion is starting a conversation via Zalo/Kakao, not completing an order on the page.
- The site targets Vietnamese-speaking users only; no additional languages or in-page language switcher are required for this version.
- Actual Zalo/Kakao handles, phone number, real customer reviews, brand assets (logo, imagery), and final marketing copy will be provided by the business. Clearly-labeled placeholder/seed content is acceptable **during development only**; it MUST NOT reach production. Placeholder contact destinations and invented testimonials are blocked by the production launch gate (FR-045) — reviews use an honest empty state until approved (FR-043). The brand name, slogan, and color palette are now specified (see Brand Identity) and are no longer open items.
- "Korean premium style" is interpreted as a warm, friendly, premium-but-approachable aesthetic with generous whitespace and refined typography, built on the specified palette (soft pink main, beige secondary, Korea red accent, warm white background) — welcoming rather than cold/austere luxury, while still polished.
- Exact color values (hex codes) are left to implementation; "soft pink", "beige", "Korea red", and "warm white" define the intended tones, and specific shades may be tuned for accessibility/contrast during design.
- No **visitor-facing** login, personalization, payment processing, or order-management functionality is in scope; those are handled off-page via the contact channels. (Administrator login for the CMS **is** in scope — see below.)
- Analytics/measurement instrumentation sufficient to evaluate the contact-tap success criteria (SC-001) is delivered as part of this feature — CTA activation events with channel and placement (FR-044), not merely assumed to exist.
- Legal/compliance pages (privacy, terms) are represented as footer links but their full content is out of scope for this feature.

### CMS / architecture assumptions *(revised)*

- The landing page fetches content **server-side at build/regeneration time** (static generation with revalidation or equivalent), not via client-side calls, so the rendered HTML stays SEO-friendly and fast on mobile. The public content endpoint is treated as the source of truth at generation time.
- Administrator accounts are provisioned by the business (initial admin seeded during setup); self-service admin sign-up and granular editor/publisher role hierarchies are out of scope for this version — a single "administrator" role that can manage all content is sufficient, provided it is securely defined (FR-025, FR-038). The full v1 authorization scope and deferred capabilities are stated in FR-025/FR-038 (auth) and FR-040 (section governance) and the plan.
- Content is stored in a document database using a revision/page-release model optimized for atomic publication (see Key Entities and plan.md), rather than assembling independently-changing records without a release boundary.
- Media/image storage uses a **storage abstraction** (local adapter for development, ready to migrate to S3/CDN) behind **stable public URLs**; only authenticated admins can upload/update/delete, public visitors can read, and metadata is stored in the database (FR-027, FR-039). Signed-URL access and advanced media transforms/CDN focal-point optimization are out of scope for this version.
- The admin dashboard is an internal tool; it does not need the same SEO/mobile-first constraints as the public landing page, though it should be usable and secure.
- Hosting/deployment topology (where the API, database, and landing page run) is an implementation/ops concern captured in `plan.md`; this spec assumes the three tiers can reach each other over the network.
- Backward-compat note: the previously planned static `content.ts` source is **superseded** by the CMS public endpoint. The shape of the content it exposes remains the same conceptual model (see `data-model.md`), so the visitor-facing sections and their invariants are unchanged.

### Explicitly deferred for v1 *(out of scope, must be recorded, not invented by the implementer)*

The following are intentionally deferred and MAY be added later, provided the non-deferrable items below are met: granular editor/publisher role separation (one secure administrator role suffices); scheduled publish/unpublish times; authenticated draft-preview URLs (v1 has no draft preview; explicitly deferred); soft-delete/restore; long-term revision browsing beyond current+previous release; advanced media transforms/focal-point; arbitrary new section types and drag-and-drop whole-page composition; multilingual content; visitor accounts/checkout/payment/order tracking; CDN optimization beyond object-store + Next.js image baseline.

**Not deferrable** (must ship in v1): safe/atomic publication and rollback to the previous release (FR-033–FR-035), optimistic concurrency (FR-036), auditability (FR-037), secure authentication lifecycle (FR-038), media security (FR-039), fail-closed build integrity (FR-030), genuine testimonials + verified contact via the launch gate (FR-043, FR-045), and deployment/backup/restore resilience (FR-049).
