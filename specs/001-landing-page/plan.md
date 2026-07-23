# Implementation Plan: VyVy Order Korea Landing Page + CMS

**Branch**: `001-landing-page` | **Date**: 2026-07-14 (revised) | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-landing-page/spec.md`

> **Revision note**: This plan supersedes the original static-landing-page plan. The page is no longer driven by a static `lib/content.ts`; content is now managed in a **NestJS + MongoDB CMS** and fetched by the Next.js page at generation time. See [research.md](./research.md) and [data-model.md](./data-model.md) (these Phase-0/1 artifacts also require refresh — see "Downstream artifact impact" below).

## Summary

Deliver a three-tier, content-managed system for VyVy Order Korea:

1. **CMS API (NestJS + MongoDB)** — persists all landing-page content and exposes (a) authenticated **admin** CRUD/reorder/publish endpoints for every section type and media, and (b) a **public** read endpoint returning only published content.
2. **Admin dashboard (Next.js)** — an internal UI for non-developers to manage content and media and publish changes.
3. **Landing page (existing Next.js app)** — unchanged visitor experience (mobile-first, Korean-premium, SEO-optimized, Vietnamese), but its content source switches from static `lib/content.ts` to the CMS public endpoint, fetched **server-side at build/regeneration time** (SSG + revalidation) so HTML stays pre-rendered.

**Technical approach**: Restructure `korean-shopping-proxy/` into a workspace (monorepo) containing the three apps plus a shared content-types package. Organize the NestJS API as a **modular monolith** (modules: auth/users, content/revisions, releases/public-delivery, media, audit, health/ops). Model content with a **revision + page-release** approach rather than one mutable collection per visual section: editing produces a working draft revision without touching the live version, and publishing validates the full candidate page and **atomically advances a page-release pointer** (with the previous release retained for rollback). Concurrency is guarded by optimistic version identifiers; all content/publish actions are audit-logged. The landing page uses Incremental Static Regeneration (ISR) with an on-publish revalidation trigger (plus periodic safety revalidation and retry of failed triggers) so published edits appear within a bounded window without a code deploy. Build/deploy is **fail-closed**: a build that cannot fetch valid published content fails rather than shipping an empty page — there is **no custom durable snapshot**; runtime resilience relies on Next.js's default ISR behavior (a failed background revalidation keeps serving the last built page).

## Technical Context

**Language/Version**: TypeScript 5.7 across all apps; React 19; Node.js (LTS compatible with Next.js 16 and NestJS 10+)

**Primary Dependencies**:
- **CMS API**: NestJS 10+, Mongoose (MongoDB ODM), `@nestjs/config`, `class-validator`/`class-transformer` (DTO validation), **cookie-based admin session auth** (`HttpOnly`/`Secure`/`SameSite` session cookie + server-side session, password hashing via bcrypt/argon2, CSRF protection, `cookie-parser`) — no JWT-in-JS/bearer storage, `@nestjs/platform-express` + Multer (media upload)
- **Landing page**: Next.js 16 (App Router, RSC, ISR/on-demand revalidation), Tailwind v4, shadcn/ui, lucide-react, Be Vietnam Pro (`next/font`), @vercel/analytics
- **Admin dashboard**: Next.js (App Router) or equivalent SPA; a component/form library (shadcn/ui) + a data-fetching/client for the admin API
- **Shared**: a `content-types` package exporting the content model TypeScript types used by all three apps

**Storage**: **MongoDB** — one database modeled for atomic publication rather than one mutable collection per visual section. Preferred model: a **page/release document** holding section configuration (including per-section enabled/disabled visibility for optional sections), ordered references to published revisions, plus content-revision documents, with separate collections only where independent lifecycle or volume justifies it — `media`, `users`, `audit`, and (optionally) reusable `reviews`/`categories`. **No separate durable snapshot / last-good store is built** — the current page-release document IS the published content the public endpoint serves. Indexes and uniqueness constraints (current-release pointer, revision version, media key, admin username) are defined in the data model. Media binaries live behind a **storage abstraction** — a local-disk adapter for development, ready to migrate to S3/CDN — served at **stable public URLs**; only metadata + URLs are stored in Mongo.

**Testing**: NestJS unit/e2e via Jest + Supertest for the API covering auth lifecycle & authorization, validation, publishing integrity/atomic release, optimistic concurrency/conflict, media security, draft-leakage, and audit logging; contract tests for the public and admin APIs to prevent drift; end-to-end tests for fail-closed build behavior (build fails when the CMS yields no valid content), cache invalidation/retry, and admin error/conflict/publish-failure states; automated accessibility and SEO-metadata checks on the landing page; Lighthouse (mobile). Manual/visual validation supplements per `quickstart.md`. (The CMS has real logic to guard — auth, validation, publishing, concurrency, media; the original static page needed none.)

**Target Platform**: CMS API + MongoDB + object storage run as backend services; landing page and admin dashboard are web apps. Landing page targets modern mobile browsers primarily; admin dashboard targets desktop browsers. A concrete deployment topology, environment matrix (local/staging/production), and operational design are defined in "Deployment & operations" below.

**Project Type**: Web application — **monorepo** with three deployable apps (landing page, admin dashboard, CMS API) + shared package.

**Performance Goals**: Landing page unchanged — above-the-fold + primary CTA usable < 3s on mid-range mobile (SC-004), Lighthouse mobile Performance & SEO ≥ 90 (SC-006). CMS public read p95 < 500 ms (SC-011). Published change visible on the page within ~5 min (SC-008, FR-031).

**Constraints**: Landing page must stay pre-rendered (no client-only content fetch) to preserve SEO/mobile (FR-024); admin endpoints must be authenticated with a secure session lifecycle (FR-025, FR-038); public endpoint exposes one internally-consistent published release only (FR-023, FR-034); editing must not disturb the live release before publish (FR-033); build/deploy is fail-closed — a build that cannot fetch valid published content MUST fail rather than ship an empty page (FR-030), with no custom last-good/snapshot fallback (runtime relies on Next.js ISR defaults); concurrency conflicts must be detected, not silently overwritten (FR-036); media uploads must be content-validated and stored in production-appropriate storage (FR-039); Vietnamese diacritics + no horizontal overflow retained (FR-017, SC-007). **Next.js hardening**: `next.config.mjs` must NOT ignore TypeScript build errors and must NOT disable image optimization — build-time type enforcement is restored and remote images are optimized with allowed origins configured (review Important Improvement #12).

**Scale/Scope**: Low-traffic marketing site + light internal admin usage. Content volume is small (tens of records per section). Scope is one landing page + full CMS for its ~9 content types + media.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution (`.specify/memory/constitution.md`) remains an unpopulated template — **no binding governance gates**. Per the architecture review, it SHOULD be populated with security, testing, review, and deployment gates so Spec Kit has real governance authority before implementation (tracked in tasks Phase 0). Until populated, the constraints below (and the FRs/SCs in `spec.md`) are the operative gates.

Applied project-level constraints from `CLAUDE.md`/`AGENTS.md`:

- ⚠️ **Code location rule**: `CLAUDE.md` states "Modify files inside `korean-shopping-proxy` only" and "Do not create application code outside this folder." The new CMS API and admin dashboard are new application code. **To honor this rule, all three apps + shared package live INSIDE `korean-shopping-proxy/` as a monorepo** (`korean-shopping-proxy/apps/*`, `korean-shopping-proxy/packages/*`). No application code is created outside `korean-shopping-proxy/`. ✅ (satisfied by the chosen structure)
- ⚠️ **Existing-app relocation decision**: Honoring the rule cleanly means the current landing-page files (`app/`, `components/`, `lib/`, `public/`, config) move into `korean-shopping-proxy/apps/web/`. This is the one structural change to the existing app and **requires user confirmation before implementation** (the user asked not to modify application code yet). An alternative that avoids moving files (keep the landing page at the `korean-shopping-proxy/` root and nest `apps/api` + `apps/admin` beside it) is possible but fragile because Next.js scans the project root; the monorepo layout is recommended.
- ✅ **Specs/config in root**: Spec artifacts stay under `specs/`; workspace root keeps AGENTS.md/CLAUDE.md. No change.
- ✅ **Stack**: Next.js + TypeScript + TailwindCSS retained for the web apps; NestJS + MongoDB added for the backend (a deliberate, user-requested expansion of the stack — `CLAUDE.md`'s "Technology" list should be updated to record NestJS + MongoDB; flagged, non-blocking).

**Result**: PASS-with-conditions. Flagged decisions that MUST be recorded before implementation: (1) existing-app relocation into `apps/web` (Important #13); (2) updating `CLAUDE.md`'s technology list to include NestJS + MongoDB + object storage and the monorepo layout; (3) populating the project constitution with security/testing/review/deployment gates. These are governance/scoping confirmations, not violations. Justified expansions recorded in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-landing-page/
├── plan.md              # This file (revised)
├── spec.md              # Feature spec (revised — adds CMS)
├── research.md          # Phase 0 — NEEDS REFRESH for CMS decisions
├── data-model.md        # Phase 1 — NEEDS REFRESH: entities → Mongo schemas + admin/media/SEO
├── quickstart.md        # Phase 1 — NEEDS REFRESH: run API + DB + web + admin
├── contracts/
│   ├── content-model.md #   NEEDS REFRESH: now the API content contract
│   ├── contact-channels.md # Still valid (contact link/fallback rules)
│   └── admin-api.md     #   NEW (to add): admin + public endpoint contract
├── checklists/
│   └── requirements.md  # Spec quality checklist (revalidate)
└── tasks.md             # Task list (revised in this change)
```

### Source Code (repository root)

Target monorepo layout — all inside `korean-shopping-proxy/`:

```text
korean-shopping-proxy/
├── package.json                 # workspace root (pnpm workspaces)
├── pnpm-workspace.yaml          # NEW — declares apps/* and packages/*
├── apps/
│   ├── web/                     # Landing page (existing Next.js app, relocated here)
│   │   ├── app/                 #   layout/page/globals (rebranded, ISR from API)
│   │   ├── components/          #   section components (render from fetched content)
│   │   ├── lib/
│   │   │   ├── cms.ts           #   NEW — content API client + fetch/cache/fallback
│   │   │   └── contact.ts       #   contact link builders (unchanged rules)
│   │   └── ...
│   ├── admin/                   # NEW — admin dashboard (Next.js): login + section editors + media
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/api.ts           #   admin API client (auth header, CRUD)
│   └── api/                     # NEW — NestJS CMS
│       ├── src/
│       │   ├── main.ts          #   bootstrap, CORS, global validation pipe
│       │   ├── app.module.ts
│       │   ├── config/          #   env/config module (Mongo URI, session secret, media, storage)
│       │   ├── auth/            #   cookie-session admin auth (login/logout, guard, CSRF)
│       │   ├── content/        #   feature modules per section:
│       │   │   ├── hero/        #     schema, dto, service, admin+public controllers
│       │   │   ├── services/
│       │   │   ├── trust-points/
│       │   │   ├── process-steps/
│       │   │   ├── categories/
│       │   │   ├── reviews/
│       │   │   ├── faq/         #     NEW — optional FAQ section
│       │   │   ├── contact/
│       │   │   └── seo/
│       │   ├── media/          #   storage-adapter upload/store, serve stable public URLs
│       │   ├── releases/       #   revisions, page-release, atomic publish, rollback
│       │   ├── audit/          #   audit-event logging
│       │   ├── public/         #   aggregated current-release endpoint (GET /public/content)
│       │   └── common/         #   publish/visibility helpers, optimistic-concurrency, pipes, filters
│       ├── test/               #   Jest + Supertest e2e (auth, validation, publish, concurrency, media)
│       └── ...
└── packages/
    └── content-types/          # NEW — shared TS types (SiteContent + per-section) used by all apps
```

**Structure Decision**: Convert `korean-shopping-proxy/` into a pnpm-workspace monorepo with three apps (`web`, `admin`, `api`) and a shared `content-types` package. This satisfies the "code inside `korean-shopping-proxy/`" rule, keeps the existing landing page intact (relocated under `apps/web`), and lets the web and admin apps share one authoritative content type definition that also backs the API DTOs. The landing page consumes content via `apps/web/lib/cms.ts` (server-side fetch at build/ISR time; fail-closed build, no custom snapshot) rather than a static file.

### Data flow

```text
Admin (browser) → [HttpOnly session cookie + CSRF] → NestJS admin endpoints → MongoDB (revisions)
                                                                                │  (publish)
On publish: validate full candidate → advance current-release pointer (atomic)
                                                                                │
Next.js web (build / ISR revalidate) → GET /public/content → NestJS public endpoint → MongoDB (current release)
   └─ if API down/malformed at BUILD → build fails (fail-closed; no empty page shipped)
   └─ if API down at runtime revalidation → Next.js ISR keeps serving the last built page (default behavior)
On publish: admin/API → revalidation trigger (retried) → Next.js regenerates affected page
```

## Architecture design (added per architecture review)

### Publishing model — revisions & atomic page releases

- **Working drafts vs. live release**: Editing an item creates/updates a **draft revision**; the previously published revision stays untouched and continues to serve the live page (FR-033).
- **Atomic release**: Publishing runs full-page validation over the candidate, writes a new **page-release** document referencing the exact published revisions, then advances a single **current-release pointer** in one atomic operation (FR-034). A failed/aborted publish leaves the prior release live and consistent. (No separate snapshot is written — the release document is the content.)
- **Hybrid section validation** (FR-015/FR-040/FR-041): the validator requires the three **required** sections (Hero, Contact CTA, Footer) to be present and publishable; **optional** sections (Services, Why choose us, Ordering process, Product categories, Customer reviews, FAQ) are included only when the administrator has enabled them, and a disabled optional section is omitted from the release. Enabled-but-empty sections fall back to their defined honest empty state. The public response and the page-release reflect exactly the enabled, published sections in the FR-015 relative order.
- **Rollback**: The current and immediately previous releases are retained; reverting the pointer restores the previous release (FR-035). Longer revision history is optional/deferred.
- **Optimistic concurrency**: Each revision carries a version identifier; writes against a stale version return `409 Conflict` for the dashboard to resolve (FR-036). No silent last-write-wins.
- **Public shape**: `GET /public/content` returns one `SiteContent` release plus a release/version id (and an `ETag`) so consumers can identify the exact published version.

### Authentication, session & authorization

- **v1 authorization scope** (FR-025, FR-038): a single `administrator` role with full content access; granular editor/publisher roles are explicitly deferred. (Section governance is a separate concern — FR-040.)
- **Session transport — DECIDED**: cookie-based admin sessions. An `HttpOnly` session cookie, `Secure` in production, with `SameSite` protection and a server-side session record; **CSRF protection** on state-changing requests; **CORS** restricted to the known web/admin origins. No JWT/bearer-in-JS. Admin authentication only (no visitor login).
- **Lifecycle** (FR-038): login throttling/rate limiting, logout/revocation (server-side session invalidation), session expiry, secure password hashing (bcrypt/argon2), initial-credential provisioning + rotation, account disable. Auth events are logged.
- **Protected routes**: an auth guard covers all admin write routes; the public endpoint and public media URLs are unauthenticated read paths.

### Media storage & security

- **Access model — DECIDED**: **public** media with controlled admin upload. Only authenticated admins upload/update/delete; visitors read published media over stable public URLs. No signed URLs in v1. Metadata stored in MongoDB (FR-027, FR-039).
- **Adapter**: a storage-adapter interface with a local-disk adapter for development, designed for straightforward migration to S3/CDN later.
- **Validation**: allowlist MIME types verified by content inspection, size + dimension limits, generated (non-guessable) object keys, required alt text.
- **Lifecycle**: reference-aware deletion (block deleting assets used by the current release), orphan cleanup, backup/retention.
- **Next.js**: configure `images.remotePatterns` for the media origin so `next/image` optimization works (ties to the config-hardening constraint).

### API contract strategy

- **Versioned & stable** public and admin contracts (FR-047), authored and approved **before** schemas/DTOs/clients (`contracts/content-model.md` for public, new `contracts/admin-api.md` for admin).
- **Admin contract** covers: auth (login/logout/refresh), per-section list/detail/create/update/delete/reorder/publish, media upload/list/delete, standardized error envelope, `404`/`409` (conflict) responses, validation-error shape, and release/version fields.
- **Runtime validation**: shared TypeScript types describe *response* shapes only; because TS types vanish at runtime, untrusted requests and DB documents are validated at runtime (class-validator DTOs / schema validation). Contract tests keep types and runtime behavior from drifting (review Important #10).

### Caching, revalidation & build integrity

- **ISR**: pages are statically generated with a `revalidate` window; **on-publish** the API calls a secret-guarded revalidation route (release-aware cache tags/keys). Add periodic safety revalidation and **retry** of failed invalidation triggers; surface publish-to-live latency/failures for observability (FR-048).
- **Build integrity — DECIDED** (FR-030): **no custom durable snapshot / last-good store is built.** Instead, build/deploy is **fail-closed**: `apps/web/lib/cms.ts` fetches `GET /public/content` with a bounded timeout and rejects malformed/partial responses; if a build cannot obtain valid published content, the **build fails** and is not promoted (no empty page reaches production). At runtime, Next.js's default ISR behavior serves the last successfully generated page if a later background revalidation fails — this is Next's built-in behavior, not a bespoke mechanism. The CMS API must therefore be reachable during the first build/deploy. Tested via a fail-closed build test (build errors when the CMS yields no valid content).

### Server/Client component boundaries

- Public content and `generateMetadata()` are fetched in **Server Components** (no client-only content fetch) to preserve SEO/mobile (FR-024).
- Client Components are limited to genuine interactivity (contact bar, theme toggle). The admin dashboard naturally contains more Client Components (forms, editors) with its API client isolated there.

### Security boundaries

Distinct trust boundaries: public read API (unauthenticated, published-only), admin write API (authenticated + guarded), media URLs (**public read, admin-only mutation, no signed URLs in v1**), the revalidation endpoint (shared-secret only), and admin browser sessions (secure cookies/CSRF). The admin dashboard talks **directly browser-to-API** with `credentials: 'include'`; CORS is restricted to known web/admin origins and allows credentials.

### Deployment & operations

- **Topology**: `apps/web` (landing) and `apps/admin` as web apps; `apps/api` (NestJS) as a backend service; MongoDB and object storage as managed/provisioned services. Define domains/TLS and network reachability between tiers.
- **Environment matrix**: local, staging, production — each with its own secrets, database, and bucket; environment validation on boot.
- **CI/CD & gates**: format, lint, typecheck, tests, build, security scan, and contract-compatibility checks; defined deploy order (API + DB + storage before web/admin), staging acceptance, and rollback.
- **Data**: MongoDB indexes/uniqueness constraints, idempotent seed/migration execution, and static-content migration + parity check (FR-046) before removing the static source.
- **Runtime ops**: health/readiness endpoints, structured logging, metrics, alerting on publication/availability failures, backups with tested restore (FR-049).

## Downstream artifact impact

This architecture change was applied to `spec.md`, `plan.md`, and `tasks.md`. The remaining Phase-0/1 artifacts still describe the original static model and **must be refreshed before implementation** (re-run `/speckit-plan`, or update manually):

- **research.md** — add CMS decisions: NestJS modular-monolith structure, MongoDB/Mongoose revision + page-release modeling, **cookie-session** admin auth (decided), **public media** with storage abstraction (decided), **fail-closed build integrity, no custom snapshot** (decided), ISR + on-publish revalidation, monorepo tooling. (Existing decisions on SEO, a11y, contact links, palette remain valid.)
- **data-model.md** — model content as **revisions** + a **page-release** document (with per-section visibility) and a **current-release pointer**, each carrying a version id (optimistic concurrency), timestamps, and authorship; add Admin user, Media asset, Audit event, SEO metadata, FAQ item, and the aggregated `SiteContent` public-response shape. No separate durable-snapshot collection. Do NOT model each section as an independently-mutated collection.
- **contracts/content-model.md** — reframe as the **API content contract** (public `GET /public/content` current-release response shape + release/version/ETag); its invariants (INV-1…INV-8) still apply to the rendered page.
- **contracts/contact-channels.md** — still valid (contact link/fallback rules), now sourced from managed contact content.
- **contracts/admin-api.md** *(new)* — author the admin endpoint contract: auth, per-section CRUD/reorder/publish, media upload, error/validation semantics.
- **quickstart.md** — update run steps to start MongoDB + `apps/api` + `apps/web` (+ `apps/admin`), seed content, and add admin/CMS validation scenarios.
- **checklists/requirements.md** — revalidate against the revised spec (new FRs/SCs, admin persona).

## Complexity Tracking

Justified deviations from the original single-app, no-backend design (driven by the user's explicit CMS requirement):

| Addition | Why Needed | Simpler Alternative Rejected Because |
|----------|------------|--------------------------------------|
| NestJS CMS API (new backend) | Non-devs must manage content; requires persistence, auth, validation, publish workflow (FR-021–FR-032) | Static `content.ts` (original) can't be edited by non-devs and needs a code deploy per change |
| MongoDB | Persist managed content + media metadata with flexible per-section documents | Flat files / git-backed content reintroduces the deploy-to-edit problem and lacks auth/validation |
| Admin dashboard (3rd app) | A UI is required for non-developers to perform CRUD/reorder/publish (FR-032) | Editing JSON or hitting the API by hand is not usable by business staff |
| Monorepo + shared types package | Three apps must share one content model and stay consistent | Duplicating types across apps causes drift between API responses and page rendering |
| Automated API tests (Jest/Supertest) | Auth, validation, and draft/publish are real logic that must not regress | Manual-only testing (original) is insufficient for security/data-correctness behavior |
