---

description: "Task list for VyVy Order Korea landing page + CMS implementation"
---

# Tasks: VyVy Order Korea Landing Page + CMS

**Input**: Design documents from `/specs/001-landing-page/`

**Prerequisites**: plan.md (revised), spec.md (revised), and the **Phase 0** artifact refresh (research.md, data-model.md, contracts/content-model + contact-channels + new admin-api, quickstart.md, checklist) — these must be consistent before Phase 1.

**Tests**: Automated API + contract + e2e tests ARE in scope (auth lifecycle, authorization, validation, publishing integrity/atomic release, optimistic concurrency, media security, audit, fail-closed build integrity, cache invalidation) plus automated accessibility/metadata checks. Remaining landing-page/dashboard visuals are validated per `quickstart.md`.

> **Test-first ordering (Constitution III)**: although test tasks are listed after their implementation tasks within a phase for readability, the constitution requires tests for a behavior to be authored and reviewed **before that behavior is considered done**. For the security-/data-integrity-critical behaviors (auth T024/T024B, publishing/rollback T029/T029B/T029E, concurrency T029C, media T028B), write the corresponding contract/integration test (T025d–T027d, T034–T034E) alongside or before completing the implementation — a behavior is not "done" until its test exists and passes.

**Organization**: Grouped by user story — US1 visitor contact (P1), US2 admin content management (P2), US3 ordering process (P3), US4 trust/categories/reviews (P4).

**Working directory**: All app code lives inside `korean-shopping-proxy/`, restructured as a pnpm-workspace monorepo (`apps/web`, `apps/admin`, `apps/api`, `packages/content-types`). Paths below are relative to `korean-shopping-proxy/`.

> ⚠️ **Blocking decision before T001**: Restructuring into a monorepo relocates the existing landing page into `apps/web/`. Confirm this (or the no-move alternative) before executing — see plan.md Constitution Check. Also update `CLAUDE.md`'s Technology list to include NestJS + MongoDB. These are handled in **Phase 0** below.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1/US2/US3/US4 (user-story phases only)

---

## Phase 0: Decisions, Contracts & Artifact Refresh (BLOCKING — no application code)

**Purpose**: Resolve the architecture contradictions and missing contracts the review flagged. **No task in Phase 1+ may begin until Phase 0 is complete** — schemas, clients, and tests cannot be built deterministically against contradictory or missing contracts.

- [x] T0A Record the two blocking decisions: (a) monorepo relocation of the landing page into `apps/web/`, and (b) stack expansion. **Done 2026-07-16** — `CLAUDE.md` and `AGENTS.md` updated with the approved stack (Next.js + TypeScript + Tailwind, NestJS, MongoDB, media storage) and the monorepo layout. (The physical file move remains T001, still gated as code.)
- [x] T0B Populate `.specify/memory/constitution.md` with security, testing, review, and deployment gates. **Done 2026-07-16** (v1.0.0).
- [x] T0C Refresh `research.md` for the CMS, encoding the **decided** policies: NestJS modular-monolith; MongoDB revision/page-release modeling; **cookie-session admin auth**; **public media with admin-only upload behind a storage abstraction (S3/CDN-ready)**; **fail-closed build integrity, no custom snapshot**; **hybrid section model** + FAQ; ISR + on-publish revalidation; monorepo tooling. Superseded static decisions archived. **Done 2026-07-16.**
- [x] T0D Refresh `data-model.md`: revision + page-release model with atomic-publish/rollback, optimistic-concurrency version fields, per-section visibility, Admin user/Session, Media asset, Audit event, SEO, **FAQ item**, aggregated `SiteContent` shape, indexes/uniqueness (no durable-snapshot collection). **Done 2026-07-16.**
- [x] T0E Author `contracts/content-model.md` (public `GET /public/content`, release/version/ETag, enabled+published only) **and** new `contracts/admin-api.md` (cookie-session auth + CSRF; per-section CRUD/reorder; section enable/disable; media; publish/rollback; standardized error envelope with `401/404/409/422/429`; versioning). Refreshed `contracts/contact-channels.md`. **Done 2026-07-16.**
- [x] T0F Refresh `quickstart.md`: run MongoDB + storage adapter + `apps/api` + `apps/web` + `apps/admin`, seed, and add admin/CMS + publishing + rollback + visibility + fail-closed build validation scenarios (V1–V15). **Done 2026-07-16.**
- [x] T0G Re-validate `checklists/requirements.md` against the revised spec (FR-033–FR-051, SC-013–SC-019, admin persona). **Done 2026-07-16.**

**Checkpoint**: ✅ Architecture decisions recorded; all Phase-0/1 design artifacts and contracts are internally consistent. **Remaining human approval before Phase 1 code**: business sign-off on the four recorded decisions + explicit go-ahead to physically relocate the app into `apps/web/` (T001).

---

## Phase 1: Setup (Workspace & Scaffolds)

- [x] T001 Convert `korean-shopping-proxy/` to a pnpm workspace: added root `package.json` + `pnpm-workspace.yaml` (globs `apps/*`, `packages/*`); relocated the landing page into `apps/web/` via `git mv`; web builds. **Done.**
- [x] T002 Scaffold the NestJS CMS app in `apps/api/` (package.json, nest-cli.json, tsconfig(.build), src/main.ts, src/app.module.ts); `nest build` passes. **Done.**
- [x] T003 Scaffold the admin dashboard app in `apps/admin/` (Next.js App Router: layout, base page, tsconfig, next.config, package.json); builds. **Done.**
- [x] T004 [P] Create shared package `packages/content-types/` (package.json + tsconfig + src/index.ts skeleton); `tsc` builds to dist. Full types in T009. **Done.**
- [x] T005 [P] Added `docker-compose.yml` (Mongo 7) and `.env.example` for `apps/api` (MONGO_URI, SESSION_*, CORS_ORIGINS, STORAGE_* + local media dir, MEDIA_PUBLIC_BASE_URL, WEB_REVALIDATE_URL, REVALIDATE_SECRET, SEED_ADMIN_*), `apps/web` (CMS_PUBLIC_URL, REVALIDATE_SECRET, MEDIA_ORIGIN, NEXT_PUBLIC_SITE_URL, timeout), `apps/admin` (CMS_ADMIN_API_URL). Boot-time env validation wired in T007. **Done.** (All URLs/domains via env — production domain not finalized.)
- [x] T006 [P] Removed `apps/web/components/pricing.tsx` and its `page.tsx` refs. **Kept** `apps/web/components/faq.tsx` (FR-050, adapted in US4). **Done.**
- [x] T006B [P] Hardened `apps/web/next.config.mjs`: `ignoreBuildErrors: false`, image optimization enabled, `images.remotePatterns` derived from `MEDIA_ORIGIN` env (no hardcoded domain). Web build passes with type-checking on. **Done.**

---

## Phase 2: Foundational (Shared Data Layer + Public Read + Web Client)

**Purpose**: Stand up the CMS data layer, the public published-content endpoint, seed data, and the landing page's API-based content client. Every user story depends on this.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T007 Configured `apps/api` with `@nestjs/config` (boot-time env validation, fail-closed) + a Mongoose connection reading `MONGO_URI` in `apps/api/src/config/`. Verified: API boots and connects to MongoDB. **Done.**
- [x] T008 `apps/api/src/main.ts`: CORS restricted to env `CORS_ORIGINS` (credentials for direct browser-to-API admin), global `ValidationPipe` (whitelist + forbidNonWhitelisted + transform), and the standardized-envelope exception filter (`apps/api/src/common/http-exception.filter.ts`). **Done.**
- [x] T009 Defined the full shared content model in `packages/content-types/src/index.ts` (SiteContent release shape + Hero, ServiceOffering, TrustPoint, ProcessStep, ProductCategory, CustomerReview, **FaqItem**, ContactChannel, ContactCTA, Footer, Seo, MediaAsset, Brand; `PublishState`, `ImageRef`, `CtaRef`, `OptionalSectionKey`, `ReleaseMeta`). Compiles to `dist`. **Done.**
- [x] T010 Common CMS building blocks: `apps/api/src/common/base-fields.ts` (publishState/order/version + timestamps), release primitives `apps/api/src/releases/release.schemas.ts` (PageRelease, SiteState + section visibility) + `releases.service.ts` (current-release query helper), and the standardized error envelope in `common/http-exception.filter.ts` (incl. `409 CONFLICT`). **Done.** (Admin CRUD DTOs/validation land with controllers in US2 T025a–T027a.)
- [x] T011/T012/T013 Mongoose schemas + feature modules for all sections — hero, contact, seo, services, trust-points, process-steps, categories, reviews, faq (`apps/api/src/content/schemas.ts` + `content.module.ts`) and media metadata (`apps/api/src/media/`). Also `apps/api/src/users/` (AdminUser for seed). **Done.** (Per-section admin DTOs/services/controllers are US2.)
- [x] T013B Per-section **visibility** state (services/trust-points/process-steps/categories/reviews/faq) in `release.schemas.ts` (`sectionVisibility` on PageRelease + `sectionVisibilityDraft` on SiteState); required sections have no disable state. Default: reviews disabled (honest empty state). **Done.**
- [x] T014 Public endpoint `GET /public/content` (`apps/api/src/public/`): returns the current release as `SiteContent` with `meta.releaseNumber` + `ETag` (304 on `If-None-Match`); only enabled+published sections (disabled omitted). Verified: ETag `"release-1"`, reviews section omitted. **Done.**
- [x] T015 **Non-destructive idempotent** seed (`apps/api/src/seed/`), **insert-only** semantics (R2-P1-01): all seed writes use `$setOnInsert` — records created only if absent, never modified after; admin content (no seedKey) untouched; **admin edits to seed-owned records are never overwritten**; the existing admin's **password hash / enabled state are never reset** by a normal seed (reset/reactivation are explicit workflows); initial release+pointer created only when nothing is published; `--force-reset` (dev-only, refused in prod); refuses default admin password in prod. Reviews **unapproved** → honest empty state (FR-043). Verified by `apps/api/test/seed.idempotency.test.ts` (3 Mongo tests: admin data + edited-seeded-record + admin security state all survive reseed; no duplicates; release preserved) + contract test that assembled content matches the **strict** public schema with `order` preserved (P1-01/P1-03). **Done.**
- [x] T016 `apps/web/lib/cms.ts`: server-side fetch of `GET /public/content` with bounded+validated timeout and **full strict runtime schema validation** (`@vyvy/content-types` Zod). URL/CTA policy is **parser-based and context-specific** (R3-P1-01): absolute http(s) URLs parsed via `new URL()` (non-empty hostname, no credentials — rejects `https:///`); site-relative paths reject `//`, backslashes (`/\evil.example`), control chars, and any off-origin resolution; anchors are `#id`-only; per-field policies (image src: URL/relative, footer href: URL/relative/anchor, canonical: absolute URL only, social: https-only); **CTA discriminated union** — anchor CTAs require a safe target, contact-channel CTAs prohibit `target`; **cross-field CTA-reference integrity** (R4-P1-01): every non-anchor CTA channel must exist in `content.contact`, hero primaryCta must be a contact CTA (never an anchor — FR-004), the dedicated Contact-CTA section is contact-only + requires Zalo & Kakao, with precise Zod issue paths (rule to be reused by the T029 publish validator). **Contact identity (R5-P1-01 / INV-10):** each channel `type` may appear at most once in `content.contact`; a duplicate is rejected at `contact.<index>.type` so a `CtaRef` (addressed by `type` alone) resolves deterministically. Strict nested objects; trimmed non-empty strings; per-channel handles. **Fail-closed** (throws → build fails); no snapshot. Verified: build fails on CMS down (clean), 404, partial 200, unsafe-scheme 200, **malformed URL/CTA 200 (Codex r3 repro)**, **unresolved-CTA-reference 200 (Codex r4 repros)**, and **duplicate-contact-type 200 (Codex r5)** via `apps/web/lib/cms.test.ts`. **Done.**
- [x] T016B [P] `apps/web/lib/contact.ts` (Zalo/Kakao/phone/email/social builders + R-1/R-2/R-3 fallback; social pass-through is **parsed https-only** — http/credentials/malformed/unsafe schemes degrade to `#`) + `contact.test.ts` (**9 tests**, all pass). **Done.**
- [x] T017 `apps/web` ISR: `export const revalidate = 300` + `apps/web/app/api/revalidate/route.ts` guarded by the `x-revalidate-secret` **header only** (no query-string secret — P2-01; `apps/web/lib/revalidate-auth.ts` + 5 tests). `revalidatePath('/')` on publish; CONTENT_TAG on the fetch. `generateMetadata` fetches SEO from CMS (build-time, fail-closed). Verified: route `/` static + Revalidate 5m. **Done.**
- [x] T018 [P] Brand palette theme tokens (soft pink main / beige secondary / Korea red accent / warm white bg) in `apps/web/app/globals.css` (FR-019). **Done.**

**Checkpoint**: The landing page can be generated from live CMS content; data layer + public API + seed ready.

---

## Phase 3: User Story 1 - Visitor decides to make contact (Priority: P1) 🎯 MVP

**Goal**: The mobile visitor understands the service and can tap Zalo/Kakao from anywhere — rendered from CMS-published content.

**Independent Test**: Seed content, generate the page, load ~375px: hero shows brand + slogan + primary CTA above the fold (single `<h1>`); sticky bar keeps Zalo/Kakao reachable at any scroll; taps resolve with web fallback.

- [x] T019 [P] [US1] Adapt `apps/web/components/hero.tsx` (§1) to render from fetched `content.hero`/`content.brand`: single `<h1>`, slogan/value prop, above-the-fold primary contact CTA (Korea-red accent) (FR-004, FR-018). **Done** — props-driven server component; primary CTA uses the mode-stable `bg-cta`/`text-cta-foreground` Korea-red token (r1: dark-mode fix) with href resolved via `resolveCta`; secondary CTA gated on `availableAnchors` so dead in-page anchors are hidden (r1); optional media.
- [x] T020 [P] [US1] Adapt `apps/web/components/cta-section.tsx` (§7) to render `content.cta` with Zalo AND Kakao buttons built via `apps/web/lib/contact.ts` (FR-010). **Done** — each channel CtaRef resolved via `resolveCta`/`buildHref`; anchor `#lien-he` id added.
- [x] T021 [P] [US1] Create `apps/web/components/contact-bar.tsx`: sticky mobile bar (hidden on desktop) with Zalo + Kakao from `content.contact`, ≥44px tap targets (FR-012). **Done** — `fixed bottom-0 md:hidden`, `h-14` (≥44px) targets, fixed zalo→kakao order regardless of array order.
- [x] T022 [US1] Rebrand `apps/web/components/site-footer.tsx` (§8) and `site-header.tsx` to render brand/slogan/contact from fetched content (FR-013). **Done** — both now props-driven; header is a server component (Zalo contact action + ThemeToggle); footer renders brand, contactSummary, all contact channels, footer links, copyright.
- [x] T023 [US1] Compose `apps/web/app/page.tsx` shell rendering the required sections (Hero §1, Contact CTA §7, Footer §8) + `ContactBar`, with slots for enabled optional sections in FR-015 relative order, and implement `generateMetadata()` from fetched SEO content (FR-014, FR-015). **Done** — async server component fetches once (Next dedupes with `generateMetadata`); `generateMetadata` sets `metadataBase` from `NEXT_PUBLIC_SITE_URL` so relative OG images resolve to the site origin (r1); passes `availableAnchors` to Hero; ordered FR-015 slot comments for §2–§6+FAQ (filled by T036/T041); single `<h1>`. Added shared helpers `resolveCta` (`lib/contact.ts`, +4 tests) and `components/channel-icon.tsx`.

**Checkpoint**: **Technical demo** (not the CMS MVP) — the page renders from seeded CMS content with working contact CTAs everywhere. Because self-service content management is the purpose of this revision, the shippable CMS MVP is only reached after US2 (admin UI + atomic publish). Do not ship to production before the launch gate (T057).

---

## Phase 4: User Story 2 - Content administrator manages content (Priority: P2)

**Goal**: A non-developer can log in and manage every section + media + SEO, with draft/publish, and see changes go live.

**Independent Test**: Authenticate, CRUD/reorder/publish each section and upload media via the dashboard; confirm the public endpoint returns updates, drafts stay hidden, and invalid input is rejected.

- [x] T024 [US2] Implement **cookie-session** auth in `apps/api/src/auth/`: `POST /auth/login` (verify seeded admin, hashed password) issues an `HttpOnly` session cookie (`Secure` in prod, `SameSite`); `POST /auth/logout` invalidates the server-side session; **CSRF protection** on state-changing routes; CORS restricted to web/admin origins; `AdminGuard` on all admin (write) routes (FR-025). No JWT/bearer-in-JS. **Done** — server-side `AdminSession` store (opaque random cookie token), `AdminGuard` + `CsrfGuard` (double-submit `x-csrf-token` verified against the session token), `GET /auth/me` + `GET /auth/csrf`. Verified live: HttpOnly session cookie + readable CSRF cookie, 400 on invalid body, 403 on missing/bad CSRF, 401 after logout.
- [x] T024B [US2] Auth lifecycle hardening in `apps/api/src/auth/`: session/token expiry, login throttling/rate limiting, account disable, initial-credential rotation, and security-event logging (FR-038). **Done** — TTL-indexed session expiry (+ defensive guard check), per-username throttle → `429` lockout after `LOGIN_MAX_ATTEMPTS`, disabled account rejected at login and mid-session (session revoked), `POST /auth/password` rotation (revokes other sessions), `SecurityEvent` append-only log. Env: `LOGIN_MAX_ATTEMPTS`/`LOGIN_LOCKOUT_MINUTES`/`LOGIN_ATTEMPT_WINDOW_MINUTES`.
> **Task split note (review Important #4 / final-review #13)**: Each module batch is split into separately-checkable subtasks by concern — (a) schema/DTO + runtime validation, (b) service with draft-revision writes + optimistic-concurrency version checks, (c) admin CRUD/reorder controller, (d) contract test — so each has one verifiable outcome. Atomic publish is centralized in T029 (not per-module). Dependency within a batch: a→b→c→d.

- [x] T025a [P] [US2] Schema/DTO + runtime validation for **hero, contact, seo** in `apps/api/src/content/{hero,contact,seo}/` (FR-022, FR-028). **Done** — input validated in the service layer against the **shared Zod schemas** (`heroSchema`/`seoSchema`/`contactChannelSchema`) so admin input and the public contract can't drift and validation runs under both `tsc` and the `tsx` test runner; `content.common.ts` maps Zod issues → `422 VALIDATION`.
- [x] T025b [P] [US2] Services for hero/contact/seo: draft-revision writes (no mutation of live release, FR-033) + optimistic-concurrency checks (FR-036). **Done** — singleton base service (hero/seo) with `version`-checked `findOneAndUpdate` (`409` on stale, `details.currentVersion`), **PUT = full replace** (omitted optional fields cleared via `$unset`), writes set `publishState:'draft'` and never touch the release snapshot. `ContactService` (list): create/update/delete/reorder with optimistic concurrency + **type-uniqueness INV-10** (`422` on duplicate type).
- [x] T025c [P] [US2] Admin CRUD/reorder controllers for hero/contact/seo (guarded by AdminGuard). **Done** — `content/hero` (GET/PUT), `content/seo` (GET/PUT), `content/contact` (GET/POST/PUT `:id`/DELETE `:id?version=`/POST `reorder`), all `@UseGuards(AdminGuard, CsrfGuard)`.
- [x] T025d [P] [US2] Contract tests for hero/contact/seo admin endpoints against `contracts/admin-api.md`. **Done** — `apps/api/test/content.contract.test.ts` (20 Mongo-gated tests after concurrency remediation: auth/CSRF, singleton validation/full replace, contact CRUD, DB-backed type uniqueness, accurate stale versions, malformed-id handling, persisted atomic ordering, and reorder/create concurrency).
- [x] T026a [P] [US2] Schema/DTO + validation for **services, trust-points, process-steps** (FR-022). **Done** — strict admin-input schemas are derived from the shared public Zod schemas with response-only `id`/`order` omitted; process-step `icon` remains optional and clearable on full update.
- [x] T026b [P] [US2] Services (draft-revision + concurrency) for services/trust-points/process-steps. **Done** — shared `ListContentService` implements validated CRUD, fresh-version `409`s, malformed-id `404`s, draft writes, persisted single-document ordering, and CAS-protected reorder; create/delete bump `orderVersion`.
- [x] T026c [P] [US2] Admin CRUD/reorder controllers for services/trust-points/process-steps. **Done** — authenticated + CSRF-guarded list/detail/create/update/delete/order/reorder routes at `/content/services`, `/content/trust-points`, and `/content/process-steps`.
- [x] T026d [P] [US2] Contract tests for services/trust-points/process-steps. **Done** — `apps/api/test/content-lists.contract.test.ts` (6 Mongo-gated HTTP tests covering auth/CSRF, validation, CRUD, stale item conflict, optional-field clearing, malformed ids, and concurrent reorder with exactly one winner).
- [x] T027a [P] [US2] Schema/DTO + validation for **categories, reviews, faq** (FR-022, FR-050); reviews carry approval/consent flags (FR-043). **Done** — strict write schemas derive from the shared public schemas; review writes require both `approved` and `consentGiven`, and approval is rejected until consent exists.
- [x] T027b [P] [US2] Services (draft-revision + concurrency) for categories/reviews/faq. **Done** — all three use `ListContentService` for draft CRUD, fresh-version conflicts, full-update optional-field clearing, and persisted CAS ordering; public review assembly requires approval + consent and strips moderation fields.
- [x] T027c [P] [US2] Admin CRUD/reorder controllers for categories/reviews/faq. **Done** — authenticated + CSRF-guarded list/detail/create/update/delete/order/reorder routes at `/content/categories`, `/content/reviews`, and `/content/faq`.
- [x] T027d [P] [US2] Contract tests for categories/reviews/faq. **Done** — `apps/api/test/content-editorial.contract.test.ts` (6 Mongo-gated HTTP tests covering auth/CSRF, validation, CRUD, consent-gated review approval, public moderation-field isolation, malformed ids, and concurrent FAQ reorder with exactly one winner).
- [x] T028 [US2] Media endpoints (Multer) in `apps/api/src/media/`, admin-guarded (upload/update/delete only for authenticated admins): store via the **storage adapter** (local dev adapter, S3/CDN-ready) and return a **stable public URL**; list + delete; persist metadata in MongoDB (FR-027).
- [x] T028B [US2] Media security in `apps/api/src/media/`: MIME allowlist via content inspection, size/dimension limits, generated (non-guessable) object keys, required alt text, reference-aware deletion (block deleting assets used by the current release) + orphan cleanup; public read access (no signed URLs in v1) (FR-039).
- [x] T028C [US2] Section-visibility admin endpoint(s) in `apps/api/`: enable/disable each optional section; enforce that required sections cannot be disabled; visibility flows into the release and public response (FR-040, FR-051).
- [x] T029 [US2] Implement the **atomic page-release publish** in `apps/api/src/releases/`: validate the full candidate page using the **shared `siteContentSchema`** (hybrid section rules — required present, disabled optionals omitted, enabled-but-empty → empty state, FR-015/FR-040/FR-041; incl. cross-field CTA-reference integrity and **contact-type uniqueness INV-10 / R5-P1-01** — same rule as T016 so publish and build reject identical payloads), write a new page-release referencing published revisions, and advance the current-release pointer atomically; `GET /public/content` serves the current release (published-only) (FR-023, FR-026, FR-034).
- [x] T029B [US2] Implement **rollback** API: revert the current-release pointer to the previous published release, retain current+previous releases, and emit an audit event (FR-035).
- [x] T029E [US2] Admin **rollback workflow** in `apps/admin/`: view current/previous release, initiate + confirm rollback, and see revalidation status; guarded against stale release state (FR-035, review final #10). Covered by an e2e test (T034B).
- [x] T029C [US2] Enforce **optimistic concurrency** across admin write services: reject stale-version writes with `409 Conflict` (FR-036).
- [x] T029D [US2] Implement **audit logging** in `apps/api/src/audit/`: record admin, action, entity/revision, timestamp, resulting release, before/after reference for every content/publish action (FR-037).
- [x] T030 [US2] On publish, trigger landing-page regeneration by calling `apps/web`'s revalidate route with `REVALIDATE_SECRET`; **retry** failed triggers and record publish-to-live latency/failures for observability (FR-048).
- [x] T031 [P] [US2] Admin dashboard auth in `apps/admin/`: login/logout page + session client (`apps/admin/lib/api.ts`), handling expired/revoked sessions and unauthorized redirects.
- [x] T032 [P] [US2] Admin dashboard section editors in `apps/admin/`: list/create/edit/reorder/publish forms for all section types **including FAQ** (FR-032, FR-050).
- [x] T032C [P] [US2] Admin dashboard **section-visibility** controls in `apps/admin/`: enable/disable each optional section (required sections shown as always-on/non-disable-able), reflected in the publish preview (FR-040, FR-051).
- [x] T032B [US2] Admin dashboard state handling: explicit loading, empty, unauthorized, validation-error, network-failure, stale-edit/conflict (409), unsaved-change, and publish-failure states with accessible error summaries and safe retry (FR-032, review Important #5).
- [x] T033 [US2] Admin dashboard media manager + SEO metadata editor in `apps/admin/` (upload/select images; edit title/description/OG) (FR-027, FR-028).
- [x] T034 [US2] Core API tests in `apps/api/test/` (Jest + Supertest): admin writes reject unauthenticated requests, validation rejects invalid content, current-release excludes drafts (SC-010, FR-025/026/029).
- [x] T034B [US2] Publishing-integrity, rollback & concurrency tests: editing a published item leaves the live release unchanged until publish; failed/partial publish leaves prior release live; rollback restores the previous release + emits audit (incl. the admin rollback workflow T029E); concurrent stale edit returns 409 (SC-013, SC-014, FR-033/034/035/036).
- [x] T034C [US2] Auth-lifecycle & authorization-policy tests: expired/revoked session rejected, login throttled, disabled account cannot authenticate, protected-route coverage (SC-019, FR-038). **Done** — `apps/api/test/auth.contract.test.ts` (11 Mongo-gated tests: unauthenticated→401, login+`/me`, wrong-password→401 then lockout→429, concurrent-failure lockout with no bypass, malformed-cookie→401 not 500, disabled→401, logout revoke, expired session→401, mid-session disable→401, CSRF 403/200, password rotation with other-session revocation). DTO-format validation (400/`forbidNonWhitelisted`) verified against the built (tsc) API live — the `tsx` node:test runner does not emit `design:paramtypes`, so DTO-pipe validation is exercised in the production build path, not under tsx (see handoff).
- [x] T034D [US2] Media-security & audit tests: disallowed MIME/oversize rejected, referenced-asset deletion blocked; every change/publish produces an audit event (FR-037/039, SC-015).
- [x] T034E [US2] Section-visibility & empty-state tests: disabled optional sections are omitted from `/public/content`; required sections cannot be disabled; enabled-but-empty sections return the defined empty state; FAQ appears only when enabled (FR-015/FR-040/FR-041/FR-051).

**Checkpoint**: US1 + US2 — content is fully manageable by non-developers, publishes atomically, and flows to the live page. **This is the true CMS MVP** (see moved MVP note below).

---

## Phase 5: User Story 3 - Visitor understands the ordering process (Priority: P3)

**Goal**: The visitor understands the end-to-end flow, rendered from CMS process steps.

**Independent Test**: Process section shows sequential numbered steps (link→quote→pay→purchase→ship→deliver) from the CMS, plus a closing CTA.

- [x] T035 [US3] Adapt `apps/web/components/how-it-works.tsx` into `apps/web/components/ordering-process.tsx` (§4): render ordered `content.processSteps` with icons + a closing contact CTA (FR-007).
- [x] T036 [US3] Insert the §4 section into `apps/web/app/page.tsx` (between Why-choose-us and Product categories per FR-015).

**Checkpoint**: US1 + US2 + US3 independently functional.

---

## Phase 6: User Story 4 - Visitor builds trust and explores categories (Priority: P4)

**Goal**: Trust points, categories, and reviews render from the CMS.

**Independent Test**: Enabled optional sections render from CMS content in FR-015 relative order; why-choose-us shows its points; categories include cosmetics/fashion/electronics/K-pop; reviews show multiple approved testimonials **or an honest empty state** when none are approved; FAQ renders when enabled; disabled optional sections are omitted while required sections (Hero/Contact CTA/Footer) always render.

- [x] T037 [P] [US4] Adapt `apps/web/components/features.tsx` into `apps/web/components/services.tsx` (§2) rendering `content.services`, with defined empty/disabled handling (FR-005, FR-041).
- [x] T038 [P] [US4] Create/adapt `apps/web/components/why-choose-us.tsx` (§3) rendering `content.trustPoints` (folding in trust-bar), with empty/disabled handling (FR-006, FR-041).
- [x] T039 [P] [US4] Adapt `apps/web/components/categories.tsx` (§5) rendering `content.categories` with distinguishable cards + non-empty alt text, with empty/disabled handling (FR-008, FR-041).
- [x] T040 [P] [US4] Adapt `apps/web/components/testimonials.tsx` (§6) rendering `content.reviews` with optional rating/location; render the **honest empty state** when no approved reviews and omit when disabled — never fabricate testimonials (FR-009, FR-041, FR-043).
- [x] T040B [P] [US4] Adapt `apps/web/components/faq.tsx` (FAQ, optional section) rendering `content.faq` Q/A items, with empty/disabled handling (FR-050, FR-041).
- [x] T041 [US4] Insert §2/§3/§5/§6/FAQ into `apps/web/app/page.tsx` respecting section visibility and the FR-015 relative order (enabled sections only; required sections always present).

**Checkpoint**: Required sections always render; enabled optional sections render in mandated order with defined empty/disabled behavior; all stories functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T042 [P] Add `apps/web/app/sitemap.ts` and `apps/web/app/robots.ts` (FR-014, SC-006).
- [x] T043 [P] Add JSON-LD structured data (LocalBusiness/Service) in `apps/web`; emit `AggregateRating` **only when eligible real approved reviews exist** — never from placeholder/empty reviews (FR-014, FR-043, SC-006).
- [x] T043B [P] Add CTA conversion analytics in `apps/web`: emit an event on each Zalo/Kakao activation tagged with channel and placement (hero, sticky bar, process CTA, dedicated CTA, header, footer), with defined privacy/consent behavior (FR-044, SC-016).
- [x] T044 [P] Wire the Open Graph/social image from CMS SEO content (with a static fallback) into `apps/web` metadata (FR-014, FR-028).
- [x] T045 Accessibility pass on `apps/web` (and admin forms): single heading hierarchy, non-empty alt everywhere, ≥44px tap targets, full keyboard access + visible focus, labels/landmarks, sufficient contrast, accessible error messaging, correct Vietnamese diacritics, legibility at ~150% font size — with an automated a11y check (FR-017, FR-042, SC-006).
- [x] T045B Desktop contact-reachability check: verify a sticky header or floating contact affordance keeps a contact action reachable from every scroll position on desktop as well as mobile (FR-012).
- [x] T046 Responsive pass on `apps/web`: no horizontal overflow/overlap at 320/375/768/1280px (SC-007).
- [x] T047 Performance & SEO pass: Lighthouse (mobile) on the built landing page (Perf & SEO ≥ 90, AF+CTA < 3s — SC-004/006); confirm `GET /public/content` p95 < 500 ms (SC-011); automated metadata check.
- [x] T048 Security pass: verify all admin writes require auth, CORS is limited to known origins, revalidate route is secret-guarded, media URLs behave per access policy, and drafts never leak (SC-010).
- [x] T048B Build-integrity pass: with the CMS unreachable or returning no valid content, the build **fails** (no empty page promoted to production); a build only succeeds after fetching valid published content; a malformed/partial response is treated as a failed fetch, not a valid page (SC-012, FR-030). Confirm runtime relies on Next.js ISR defaults (no custom snapshot). Then run full refreshed `quickstart.md`.

---

## Phase 8: Operations, Deployment & Launch (cross-cutting)

**Purpose**: Make the platform deployable, recoverable, and safe to launch — the review flagged that a locally-functional CMS is not a deployable platform.

- [x] T049 Add MongoDB indexes + uniqueness constraints (current-release pointer, revision version, media key, admin username) and idempotent seed/migration execution controls.
- [x] T050 Static-content migration: import the existing landing-page content into the CMS and run a parity check against the prior static output before removing the static source (FR-046, SC-018).
- [x] T051 Health/readiness endpoints in `apps/api` (+ web) and structured logging across API/web.
- [ ] T052 Monitoring & alerting on publication failures, invalidation-trigger failures, and availability; publish-to-live latency dashboards.
- [x] T053 Backups for MongoDB + object storage with a tested restore path (FR-049).
- [x] T054 CI pipeline: format, lint, typecheck, tests, build, security scan, and API contract-compatibility checks (FR-047).
- [x] T055 Deployment topology + environment matrix (local/staging/production): domains/TLS, network reachability, per-env secrets/DB/bucket, boot-time env validation, deploy order (API+DB+storage before web/admin), and rollback procedure.
- [ ] T056 Staging acceptance run of the full quickstart before production.
- [ ] T057 **Production launch gate** checklist: verified real Zalo/Kakao/phone destinations, approved genuine testimonials (or honest empty state), final canonical domain, real brand assets, finalized SEO, named business approval — no placeholder contact or invented reviews reach production (FR-043, FR-045, SC-017).
- [x] T058 Success-criteria validation ownership: add named validation for the user-study/measurement criteria the automated tests don't cover — SC-002 (contact discoverable ≤10s), SC-003 (process comprehension 4/5), SC-005 (trust panel ≥80%), SC-008 (admin publish-to-live ≤5 min from the administrator's view), SC-009 (typical edit ≤3 min). For each, record whether it is a **pre-launch acceptance test** or a **post-launch KPI**, with owner, sample method, environment, and evidence location. SC-001 (8% contact-tap) is instrumented (FR-044) and assigned a post-launch measurement owner.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 0 (Decisions/Contracts)**: BLOCKS everything. No application code (Phase 1+) begins until decisions are recorded and design artifacts/contracts are refreshed and consistent. **Canonical dependency order** (single, non-contradictory): approved decisions → data model → API contracts → **shared/generated response types (T009)** → runtime DTO/schema implementation (T010–T013) → backend services/controllers → clients/admin UI → integration/e2e tests → deployment.
- **Setup (Phase 1)**: Depends on Phase 0.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories (data layer + public endpoint + seed + web client).
- **US1 (Phase 3)**: Depends on Foundational (needs `/public/content`, seed, `cms.ts`).
- **US2 (Phase 4)**: Depends on Foundational (schemas exist); largely independent of US1. Auth (T024) precedes all admin CRUD/media/dashboard tasks.
- **US3 (Phase 5)** and **US4 (Phase 6)**: Depend on Foundational; independent of each other and of US2. Their `page.tsx` insertion tasks depend on the US1 page shell (T023).
- **Polish (Phase 7)**: Depends on the stories whose output it validates (T043 needs US4 reviews; T048/T048B need all).
- **Operations (Phase 8)**: Depends on the backend/publishing being in place; T050 migration + T057 launch gate precede production cutover. Health/backup/monitoring (T051–T053) should exist before staging (T056).

### Key blocking notes

- Shared types (T009) precede all schema tasks (T011–T013) and web/admin clients.
- Schemas (T011–T013, T013B) precede the public endpoint (T014), seed (T015), and all US2 admin work (T025a–T028C).
- Contact builder (T016B) precedes CTA components (T020/T021).
- `apps/web/app/page.tsx` is edited by T023, T036, T041 — **sequential** (same file).
- Auth (T024/T024B) blocks T025a–T033, T028C (all admin operations) and T034–T034D (tests).
- Atomic-release publish (T029) blocks rollback API (T029B), rollback UI (T029E), and on-publish revalidation (T030); T030 also depends on the web revalidate route (T017).
- Contracts (Phase 0 T0E) block all schema (T011–T013), client, and controller work.

### Within each user story

- API: schema/DTO → service → controller → tests.
- Web: component (renders from fetched content) → page insertion.

---

## Parallel Opportunities

- **Setup**: T004, T005, T006 [P] alongside scaffolds.
- **Foundational**: schema batches T011/T012/T013 [P] (different modules); T018 [P] (globals.css) independent of API work.
- **US1**: T019/T020/T021 [P] (hero, cta, contact-bar — different files); then T022 → T023.
- **US2**: within each batch serialize a→b→c→d; batches T025*/T026*/T027* run in parallel; dashboard T031/T032/T032C [P]; serialize T024/T024B (auth) first and T028–T030/T029E (media/publish/revalidate/rollback-UI).
- **US4**: T037/T038/T039/T040/T040B [P]; then T041.
- **Polish**: T042/T043/T044 [P].
- **Cross-story**: after Foundational, a backend dev can take US2 while a frontend dev takes US1/US3/US4 — they touch different apps (`apps/api` vs `apps/web`), serializing only `apps/web/app/page.tsx` insertions.

---

## Parallel Example: Foundational schemas

```bash
# After T009 (shared types) + T010 (common base), build section schemas together:
Task: "Schemas/DTOs/modules for hero, contact, seo (T011)"
Task: "Schemas/DTOs/modules for services, trust-points, process-steps (T012)"
Task: "Schemas/DTOs/modules for categories, reviews, faq, media (T013)"
```

---

## Implementation Strategy

### MVP First

1. Phase 0 Decisions/Contracts → 2. Phase 1 Setup → 3. Phase 2 Foundational (data layer + public endpoint + seed + web client) → 4. Phase 3 US1 → 5. Phase 4 US2.
6. **STOP and VALIDATE the CMS MVP**: a non-developer can log in, edit a section, publish atomically, and see it live; the page renders from CMS content and drives Zalo/Kakao contacts. US1 alone (seeded content, no admin UI) is a **technical demo**, not the shippable CMS MVP, because self-service management is the point of this revision.

### Incremental Delivery

1. Phase 0 + Setup + Foundational → contracts approved, data layer + page-from-API ready.
2. US1 → validate → technical demo.
3. US2 → non-devs manage content end-to-end with atomic publish (the CMS MVP — core new capability).
4. US3 → ordering process. 5. US4 → trust/categories/reviews.
6. Polish → SEO/perf/a11y/security/resilience + analytics.
7. Operations (Phase 8) → migration, deployment, monitoring, backup/restore, launch gate before production cutover.

### Parallel Team Strategy

- After Foundational: Backend dev → US2 (`apps/api` + `apps/admin`); Frontend dev → US1/US3/US4 (`apps/web`). Integrate on the public content shape (shared `content-types`) and serialize `page.tsx` edits.

---

## Notes

- API auth/validation/publishing-integrity/concurrency/media/audit are covered by automated tests (T034–T034D); contract tests guard the public/admin contracts; UI is validated via `quickstart.md`.
- All content is now managed in the CMS (FR-016/FR-021); the landing page holds no hardcoded copy — it renders from `apps/web/lib/cms.ts`.
- [P] = different files, no dependencies. [Story] maps to spec user stories.
- Downstream design docs (research.md, data-model.md, contracts/) are refreshed in **Phase 0** (T0C–T0G) — they must be consistent with this plan/spec before any Phase 1+ code (blocking).
- Commit after each task or logical group; stop at any checkpoint to validate a story independently.
