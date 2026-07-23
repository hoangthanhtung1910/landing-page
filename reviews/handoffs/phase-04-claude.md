# Phase 04 Handoff — User Story 2 (Content administrator manages content)

**Phase:** 4 (US2) — **delivered batch-by-batch**, stopping at each batch checkpoint for Codex review.
**Batch 1 — Authentication** (T024, T024B, T034C): **APPROVED by Codex** (r1–r3 resolved).
**Batch 2 — Content modules T025** (hero, contact, seo): remediation completed through r5.
**Batch 3 — Content modules T026** (services, trust-points, process-steps): completed.
**Batch 4 — Content modules T027** (categories, reviews, FAQ): **this checkpoint.**
**Completed:** Batch 1 2026-07-22 · Batch 2 final remediation 2026-07-23 · Batch 3 2026-07-23 · Batch 4 2026-07-23
**Author:** Claude through Batch-2 r4; Codex implementation takeover for Batch-2 r5 + Batches 3–4. Independent review still required.
**Prev checkpoint:** Phase 3 (`phase-03-claude.md`, approved by Codex — Phase 3 done).

Ground rules: code only inside `korean-shopping-proxy/`; no production deploy; not committed; all
URLs/origins/secrets env-driven. Technical demo, not a shippable release.
Toolchain: Node 20.20.1 · pnpm 9.15.4 (corepack) · MongoDB local `127.0.0.1:27017`.

---

## BATCH 4 — Content modules T027 (categories, reviews, FAQ)

### Delivered

- **T027a:** strict category/review/FAQ write validation derived from the shared public Zod schemas.
  Response-only ids and FAQ order are rejected. Review writes require explicit `approved` and
  `consentGiven` flags, and an approved review without consent is rejected with `422`.
- **T027b:** all three modules use `ListContentService` for draft CRUD, per-item optimistic
  concurrency, full-update optional-field clearing, malformed-id handling, and persisted CAS
  ordering. Release assembly includes only reviews that are both approved and consented, and strips
  both moderation fields from the public shape.
- **T027c:** guarded controllers for `/content/categories`, `/content/reviews`, and `/content/faq`,
  including `GET order` and version-checked `POST reorder`.
- **T027d:** `content-editorial.contract.test.ts` — 6 Mongo HTTP tests covering auth/CSRF, category
  validation and optional-field clearing, consent-gated review approval, public moderation-field
  isolation, FAQ CRUD, concurrent reorder (one 200/one 409), and malformed ids.

### Files

- Created `apps/api/src/content/{categories,reviews,faq}/*.service.ts` and controllers.
- Created `apps/api/test/content-editorial.contract.test.ts`.
- Updated the review schema, seed data/release assembly, public-controller injection, content-module
  wiring, assembly contract coverage, `tasks.md`, and this handoff.

### Verification

- Workspace lint: pass (4/4).
- Builds: `@vyvy/content-types`, `api`, and `admin` pass.
- API tests without Mongo: **18 pass / 47 skipped**.
- API tests with local Mongo: **65/65 pass**, zero skipped.
- `git diff --check`: clean.

**Gate:** T027 checkpoint reached. T028 has not started.

---

## BATCH 3 — Content modules T026 (services, trust-points, process-steps)

### Delivered

- **T026a:** strict admin input validation derived from the shared public Zod schemas. Response-only
  `id` and process-step `order` are omitted from writes; unknown fields are rejected.
- **T026b:** reusable `ListContentService` with list/detail/create/update/delete, optional-field
  clearing, draft writes, per-item optimistic concurrency, fresh conflict versions, malformed-id 404,
  and single-document CAS ordering shared by all three sections.
- **T026c:** guarded controllers for `/content/services`, `/content/trust-points`, and
  `/content/process-steps`, including `GET order` and version-checked `POST reorder`.
- **T026d:** `content-lists.contract.test.ts` — 6 Mongo HTTP tests covering auth/CSRF, validation,
  CRUD, stale writes, optional icon clearing, malformed IDs, and concurrent reorder (one 200/one 409).

### Files

- Created `apps/api/src/content/list-content.service.ts`.
- Created `apps/api/src/content/{services,trust-points,process-steps}/*.service.ts` and controllers.
- Created `apps/api/test/content-lists.contract.test.ts`.
- Updated `content.module.ts`, `tasks.md`, seed ordering initialization, and this handoff.

### Verification

- Workspace lint: pass (4/4).
- Builds: `@vyvy/content-types`, `api`, and `admin` pass.
- API tests without Mongo: **18 pass / 41 skipped**.
- API tests with local Mongo: **59/59 pass**, zero skipped.
- `git diff --check`: clean.

**Gate:** T026 checkpoint completed; superseded by the Batch 4 checkpoint above.

---

## BATCH 2 · REMEDIATION r5 — persisted seed ordering + strict stale conflict

Claude's r4 added lazy `ensureOrderDoc`, but its test still accepted `409 OR 422` and seed did not
materialize ordering handles. Codex takeover completed the finding:

- seed now creates one insert-only `ContentOrder` for all seven list sections and preserves existing
  administrator order/version on normal reruns;
- dev `forceReset` rebuilds ordering handles;
- reorder checks `orderVersion` before id-set validation and rechecks it on a set mismatch, so a list
  changed by create/delete reports **409** with the actual current version;
- tests now require 409, verify the version bump, verify seven seeded handles, and prove normal seed
  never overwrites an existing handle.

Evidence is included in the current **59/59** Mongo result.

---

## BATCH 2 · REMEDIATION r4 — response to Codex r3 re-review (race in the pre-initialized ordering state)

Codex confirmed reorder-vs-reorder is now correct (one commits, the rest `409`; no blending;
`orderVersion` required and documented) and found the remaining hole: **before the first reorder the
`ContentOrder` document doesn't exist**, so `getOrder()` handed out a *synthetic, unpersisted* `version: 0`.

| ID | Finding | Fix | Evidence |
|----|---------|-----|----------|
| **P2-E** | `orderVersion: 0` was never stored, so the pre-first-reorder state had no real concurrency control: there was nothing to compare-and-swap against, and — the actual bug — `create`/`remove` bumped the version with a non-upserting `updateOne` that **silently no-opped**, leaving a reorder prepared against a stale list still valid (`contact.service.ts`). | Added `ensureOrderDoc()`: idempotently materializes the record (`$setOnInsert` + `upsert`, seeded from the current `order`, version 0; a racing initializer just loses the duplicate-key insert). It runs on `getOrder`, `create`, `remove`, and `reorder`, so the version is **always a real stored value**. The reorder is now a plain CAS on a guaranteed document (no upsert/duplicate-key trick). | New tests: (1) **5 rounds** of 3 simultaneous reorders racing **from a deleted `ContentOrder`** (pure version-0 start) → exactly **1× 200, 2× 409**, no blending; (2) creating a channel after reading the ordering handle **invalidates** the prepared reorder (409/422) — this is the case that previously passed incorrectly. |

**Files changed in r4:** `apps/api/src/content/contact/contact.service.ts` (`ensureOrderDoc` + wiring,
simplified CAS), `apps/api/test/content.contract.test.ts` (+2 tests, `ContentOrder` model handle),
this handoff.

**Post-r4 results:** lint 4/4 · api/admin/content-types builds OK · API tests **52/52** with Mongo
(**18 pass / 34 skipped** without) · `git diff --check` clean · isolated DBs dropped.

---

## BATCH 2 · REMEDIATION r3 — response to Codex r2 re-review (1 residual P1: reorder optimistic concurrency)

r2 made the reorder genuinely **atomic**, but Codex correctly noted the ordering `version` was
*incremented and never checked* — so two concurrent reorders both succeeded (last-writer-wins) with no
conflict detection, and the r2 test only proved the result wasn't blended.

| ID | Finding | Fix | Evidence |
|----|---------|-----|----------|
| **P1-B3** | Ordering `version` was bumped but never verified: concurrent reorders silently overwrote each other instead of one getting `409` (`contact.service.ts`). | Reorder now takes a **required `orderVersion`** and writes under `findOneAndUpdate({_id, version: orderVersion}, …)`. A stale version can't match, so the upsert attempts a second insert on the same `_id` → duplicate key → translated to **`409`** with the live version. New **`GET /content/{type}/order`** returns `{ orderedIds, version }` so a client can read the handle. `create`/`remove` also `$inc` the ordering version, invalidating a reorder prepared against the old list. | New test (5 rounds × 3 simultaneous reorders sharing one `orderVersion`): **exactly 1× 200 and 2× 409** every round, plus the existing no-blend and set-integrity assertions. Also: stale `orderVersion` → 409; missing `orderVersion` → 422. |

**Contract updated:** `contracts/admin-api.md` documents `GET /content/{type}/order`, the
`{ orderedIds, orderVersion }` reorder body, and the ordering-concurrency rule.

**Files changed in r3:** `apps/api/src/content/contact/contact.service.ts` (checked `orderVersion`,
`getOrder`, version bumps on create/remove), `.../contact/contact.controller.ts` (`GET order`, reorder
body), `apps/api/test/content.contract.test.ts` (+1 test, concurrency test rewritten),
`specs/001-landing-page/contracts/admin-api.md`, this handoff.

**Post-r3 results:** lint 4/4 · api/admin/content-types builds OK · API tests **50/50** with Mongo
(**18 pass / 32 skipped** without) · `git diff --check` clean · isolated DBs dropped.

---

## BATCH 2 · REMEDIATION r2 — response to Codex r1 re-review (1 residual P1: reorder atomicity)

Codex confirmed three of the four r1 fixes (unique-index type safety, fresh `409` version, malformed-id
404) and correctly rejected the reorder fix: **`updateMany` is not isolated across documents**, so two
concurrent reorders could still interleave per-document and leave a *blended* ordering. The r1 test
suite also had no concurrent-reorder case, so it couldn't catch this.

| ID | Finding | Fix | Evidence |
|----|---------|-----|----------|
| **P1-B2** | `updateMany` (even with a pipeline) is not atomic for the whole reorder — concurrent reorders can blend (`contact.service.ts`). | **The entire ordering now lives in ONE document.** New `ContentOrder` model (`_id` = section key, `orderedIds: string[]`, `version`); a reorder is a single `findOneAndUpdate` that rewrites `orderedIds` — the only genuinely atomic primitive without replica-set transactions. `list()` sorts by that array (ids absent from it sort last, stable); `create` `$push`es and `remove` `$pull`s the id (both single-doc ops). Per-item `order` remains only as the seeded initial ordering. | New test: **5 rounds × 3 simultaneous reorders** of two different permutations → every channel present exactly once and the result is **exactly one of the submitted permutations, never a blend**. |

**Why not transactions:** a multi-document transaction would also work but requires a replica set;
the dev/test/compose environment runs standalone `mongod`. Collapsing the ordering into a single
document removes the need for one entirely.

**Trade-off recorded:** a reorder no longer flips each channel's `publishState` to `draft` (that would
reintroduce N non-atomic writes). The ordering change is tracked by the `ContentOrder` document's own
`version`, which the publish step (T029) reads when snapshotting.

**Files changed in r2:** `apps/api/src/content/schemas.ts` (+`ContentOrderSchema`, registered),
`apps/api/src/content/contact/contact.service.ts` (single-doc ordering in list/create/remove/reorder),
`apps/api/test/content.contract.test.ts` (+1 concurrent-reorder test), this handoff.

**Post-r2 results:** lint 4/4 · api/admin/content-types builds OK · API tests **49/49** with Mongo
(**18 pass / 31 skipped** without) · `git diff --check` clean · isolated DBs dropped.

---

## BATCH 2 · REMEDIATION r1 — response to Codex Batch-2 review (2× P1 concurrency + 2× API handling)

| ID | Finding | Fix | Evidence |
|----|---------|-----|----------|
| **P1-A** | Contact type-uniqueness was a check-then-write **race**: two concurrent creates of the same type both passed `assertTypeUnique` and both inserted, violating INV-10 (`contact.service.ts`). | Uniqueness is now enforced **at the DB level** — a `unique` index on `ContactChannel.type`. `create`/`update` catch the duplicate-key error (E11000) → `422`. The friendly pre-check is retained for the common (non-racing) case; the index is the guarantee. | New test: **5 concurrent** creates of `social` → exactly **1× 201**, **4× 422**, and only one `social` channel exists. |
| **P1-B** | `reorder` had **no concurrency control** — N separate `updateOne`s via `Promise.all` could partially apply / interleave (`contact.service.ts`). | Replaced with a single pipeline `updateMany`. **(Rejected by Codex and superseded by r2/P1-B2 — `updateMany` is not isolated across documents; the ordering was moved into a single document.)** | See r2. |
| **P2-C** | A stale-write `409` reported `existing.version`, read **before** the update — if a concurrent write bumped the version in between, the client got a stale `currentVersion` (`singleton.service.ts`, same pattern in `contact.service.ts`). | On conflict the service now **re-reads the live version** and returns that in `details.currentVersion` (singleton update, contact update, contact delete). | New test asserts the `409` `details.currentVersion` equals the version a fresh `GET` reports. |
| **P2-D** | A malformed `:id` (not an ObjectId) hit Mongoose `findById` → **CastError → 500** instead of a 404 (`contact.service.ts`). *(Found by self-review — the 4th review comment was not visible in the shared screenshot; please confirm this is the one.)* | `isValidObjectId(id)` guard in `update`/`remove` → `404 NOT_FOUND`. | Reproduced live (`PUT`/`DELETE /content/contact/not-an-objectid` → 500); now a new test asserts **404** for both. |

**Tests (r1):** +3 in `content.contract.test.ts` (**13 → 16**); the suite also now awaits `syncIndexes()`
so the INV-10 unique index is built before the concurrency test (Mongoose builds indexes async).

**Files changed in r1:** `apps/api/src/content/schemas.ts` (unique `type` index),
`apps/api/src/content/contact/contact.service.ts` (index-backed uniqueness + E11000, atomic reorder,
fresh conflict version, id guard), `apps/api/src/content/singleton.service.ts` (fresh conflict version),
`apps/api/test/content.contract.test.ts` (+3 tests, index sync), this handoff.

**Post-r1 results:** lint 4/4 · api build OK · API tests **48/48** with Mongo (**18 pass / 30 skipped**
without) · `git diff --check` clean · isolated DBs dropped.

> **Note for T049 (index/migration task):** INV-10 now depends on the unique `ContactChannel.type` index.
> It is created by Mongoose `autoIndex` (default on); T049 should make index creation explicit/managed
> for production rather than relying on autoIndex.

---

## BATCH 2 — Content modules T025 (hero, contact, seo)

First content-CRUD batch. Establishes the schema/DTO → service → controller → contract-test pattern that
T026/T027 (the remaining sections) will replicate, so the pattern is reviewed once before it's repeated.

### Completed tasks

| Task | Summary |
|------|---------|
| **T025a** (validation) | Admin input is validated in the **service layer** against the **shared public Zod schemas** (`heroSchema`, `seoSchema`, `contactChannelSchema` from `@vyvy/content-types`) — one source of truth for admin input and the public contract, and (unlike class-validator DTO pipes) it runs identically under `tsc` and the `tsx` test runner. `content.common.ts` maps Zod issues → the `422 VALIDATION` envelope, plus shared `409`/`404` helpers, `version` extraction, and doc serialization. |
| **T025b** (services) | `SingletonContentService` base (hero, seo): `version`-checked atomic `findOneAndUpdate` → **`409` on stale write** with `details.currentVersion`; **PUT is a full replace** (an omitted optional field is `$unset`, not left stale); every write sets `publishState:'draft'` and **never touches the live release snapshot** (FR-033). `ContactService` (list): list/create/update/delete/reorder under optimistic concurrency, enforcing **INV-10 type-uniqueness** (`422` on a duplicate channel type) so a `CtaRef` always resolves. |
| **T025c** (controllers) | `content/hero` (GET/PUT), `content/seo` (GET/PUT), `content/contact` (GET, POST, PUT `:id`, DELETE `:id?version=`, POST `reorder`). All `@UseGuards(AdminGuard, CsrfGuard)` (from Batch 1): reads need a session, writes also need CSRF. Wired in `ContentModule` (imports `AuthModule`). |
| **T025d** (contract tests) | `apps/api/test/content.contract.test.ts` — **13** Mongo-gated HTTP tests (full app + seeded content). |

### Files (Batch 2)

- **Created:** `apps/api/src/content/content.common.ts`, `.../singleton.service.ts`,
  `.../hero/{hero.service.ts,hero.controller.ts}`, `.../seo/{seo.service.ts,seo.controller.ts}`,
  `.../contact/{contact.service.ts,contact.controller.ts}`, `apps/api/test/content.contract.test.ts`.
- **Modified:** `apps/api/src/content/content.module.ts` (wire services/controllers + `AuthModule`),
  `apps/api/package.json` (+`zod` as a direct dep — used for admin-input validation),
  `specs/001-landing-page/tasks.md`, this handoff.

### Technical decisions (Batch 2)

- **Validation via shared Zod schemas in the service**, not class-validator DTOs. Reuses the public
  source of truth, gives precise field errors, and is fully testable under `tsx` (which emits no
  decorator metadata — see the Batch-1 note). `.strict()` schemas reject unknown keys, matching the
  global pipe's `forbidNonWhitelisted`.
- **Draft model matches the architecture:** the per-section collections are the editable working copy;
  the public site serves the immutable `PageRelease` snapshot. So a draft edit (even an INV-10-valid but
  page-inconsistent one, e.g. a hero primary CTA referencing a not-yet-configured channel) never affects
  live — page-wide cross-field rules are enforced at publish (T029, a later batch). Contact type-
  uniqueness is enforced eagerly on write because it's a per-item invariant with clear early feedback.
- **PUT = full replace** for singletons (omitted optionals cleared) so the admin UI can remove a
  `secondaryCta`/`media`/`canonical` by sending the object without it.
- **Optimistic concurrency** is a single atomic `findOneAndUpdate({_id, version}, {$inc:{version:1}})`;
  a non-match re-reads to report the current version in the `409`.

### Results (Batch 2)

- `pnpm -r lint` — **4/4 pass**; `api`/`admin`/`content-types` builds pass; `git diff --check` clean.
- API tests — **18 pass / 27 skipped** without Mongo; **45/45** with Mongo (13 new content tests).
- Contract tests cover: 401 unauth, 403 no-CSRF, GET/PUT hero+seo, `409` stale, `422` invalid, PUT
  full-replace clears an omitted optional, contact CRUD, `422` duplicate type, `409` stale contact, and
  reorder id-set validation.
- **Live smoke (built tsc API):** unauth `/content/hero` → 401; authed GET → 200; PUT (valid) → 200 with
  `version` bumped + `publishState:"draft"`; `GET /content/contact` → 200. Isolated DB dropped.

### Gate

Batch 2 (T025 content modules) checkpoint reached. **Batch 3 (T026 — services/trust-points/process-
steps) not started; stopping for independent Codex review.**

---

## REMEDIATION r3 — response to Codex r2 re-review (1 residual P1 + stale count)

| ID | Finding | Fix | Evidence |
|----|---------|-----|----------|
| **P1-1c** | `TRUST_PROXY=true` was accepted, making Express trust a client-supplied `X-Forwarded-For` — an attacker could spoof a fresh IP per request and bypass the per-IP login throttle (`env.validation.ts`). The "never in prod" comment was not enforced. | Boot-time **production guard**: `validateEnv` throws when `parseTrustProxy(TRUST_PROXY) === true` under `NODE_ENV=production` (matches the existing `SESSION_COOKIE_SECURE`/secret guards). Operators must use a hop count or trusted subnets. | New env tests: `parseTrustProxy` value mapping; production `TRUST_PROXY=true` → throws; `TRUST_PROXY=1` → accepted. |
| **DOC-6** | §8 re-run comment still said `18/28`-era counts inconsistent with §5. | Counts reconciled after the +2 non-gated env tests: **18 pass / 14 skipped** (no Mongo), **32/32** (with Mongo), everywhere. | `pnpm --filter api test` → 18/32; `RUN_MONGO_TESTS=1 … ` → 32/32. |

**Tests (r3):** +2 in `env.validation.test.ts` (not Mongo-gated) → API suite **18 pass / 14 skipped**
without Mongo, **32/32** with Mongo.

**Files changed in r3:** `apps/api/src/config/env.validation.ts` (production `TRUST_PROXY=true` guard),
`apps/api/test/env.validation.test.ts` (+2), this handoff.

---

## REMEDIATION r2 — response to Codex r1 re-review (2 residual P1)

r1 fixed the malformed cookie, but the two rate-limit P1s were not fully closed: the counter was atomic
yet the password was still verified for every concurrent request before the lock tripped, and per-IP
keying is meaningless behind a reverse proxy when `req.ip` is the proxy's address.

| ID | Finding | Fix | Evidence |
|----|---------|-----|----------|
| **P1-2b** | Concurrent requests were still password-checked before the lock engaged (`auth.service.ts`). | **Atomic pre-verification reservation**: `reserveAttempt()` bumps the in-window counter in a single pipeline update *before* any bcrypt check; a request over `LOGIN_MAX_ATTEMPTS` is rejected `429` up front, so the password is verified at most N times per window even under load. | New assertion: 10 simultaneous wrong-password logins (threshold 3) → **≤3 `login.failure` security events** (bcrypt ran ≤3×), ≥7 refused `429`, then the account is locked. |
| **P1-1b** | Per-IP isolation was defeated behind a proxy — `req.ip` was the proxy IP (and blindly trusting `X-Forwarded-For` is spoofable) (`auth.controller.ts`/`main.ts`). | Added env-driven **`TRUST_PROXY`** (`parseTrustProxy`) → `app.set('trust proxy', …)`. Default `false` (socket IP, unspoofable); behind a known proxy set the hop count or trusted subnets so the real client IP is used safely. | Live (built API, `TRUST_PROXY=1`): 3 fails from `X-Forwarded-For: 1.1.1.1` → 4th **429**; correct login from `2.2.2.2` → **200** (a different client is not locked). |

**Tests (r2):** the concurrency test now asserts the bcrypt-verification bound via `SecurityEvent`
counts (still **11 auth tests**; API suite **30/30** with Mongo).

**Files changed in r2:** `apps/api/src/auth/auth.service.ts` (reserve-before-verify),
`apps/api/src/config/env.validation.ts` (`TRUST_PROXY` + `parseTrustProxy`), `apps/api/src/main.ts`
(`trust proxy`), `apps/api/.env.example` (`TRUST_PROXY`), `apps/api/test/auth.contract.test.ts`
(strengthened concurrency assertion), this handoff.

---

## REMEDIATION r1 — response to Codex Batch-1 review (2× P1 + 1× P2)

| ID | Finding | Fix | Evidence |
|----|---------|-----|----------|
| **P1-1** | Username-only lockout let an attacker lock a known admin out remotely (DoS) (`auth.service.ts`). | Throttle key is now **`username + client IP`** (`throttleKey()`), so a lockout binds to the attacker's IP; the victim's logins from their own IP are unaffected. **(Completed in r2/P1-1b: `req.ip` is only trustworthy once `TRUST_PROXY` is configured.)** | Live per-IP isolation verified in r2. |
| **P1-2** | Concurrent failed logins bypassed the threshold — the counter used a racy read-then-write (`auth.service.ts`). | Made the counter atomic (pipeline update). **(Superseded by r2/P1-2b: the counter alone wasn't enough — the reservation now happens BEFORE password verification.)** | See r2 evidence (bcrypt bounded to ≤N). |
| **P2** | A malformed cookie made every request 500 — `decodeURIComponent` threw (`cookies.ts`). | `parseCookies` wraps the decode in try/catch and falls back to the raw value. | New test: `GET /auth/me` with `cookie: vyvy_admin_session=%E0%A4%A; other=%` → **401 UNAUTHENTICATED**, not 500. |

**Tests (r1):** +2 in `auth.contract.test.ts` (concurrent-bypass, malformed-cookie) → **11 auth tests**;
API suite **30/30** with Mongo.

**Files changed in r1:** `apps/api/src/auth/auth.service.ts` (composite throttle key + atomic pipeline),
`apps/api/src/auth/cookies.ts` (safe decode), `apps/api/test/auth.contract.test.ts` (+2), this handoff,
`specs/001-landing-page/tasks.md` (T034C count).

---

## 1. Completed tasks (Batch 1)

| Task | Summary |
|------|---------|
| **T024** | Cookie-session admin auth in `apps/api/src/auth/`. Server-side `AdminSession` store keyed by an opaque 32-byte random token carried in an `HttpOnly` cookie (`Secure` from env, `SameSite` from env) — no JWT/bearer-in-JS. `POST /auth/login` (bcrypt verify + enabled check), `POST /auth/logout` (server-side revoke + cookie clear), `GET /auth/me`, `GET /auth/csrf`. `AdminGuard` resolves the cookie to a live admin; `CsrfGuard` enforces a double-submit `x-csrf-token` header (verified against the session's server-side token, constant-time) on POST/PUT/PATCH/DELETE. Both guards are exported for later admin write modules. |
| **T024B** | Lifecycle hardening. Session expiry via a TTL index on `expiresAt` **and** a defensive expiry/`revokedAt` check in the guard. Login **throttle** keyed by **username + client IP** (r1/P1-1) → `429` lockout after `LOGIN_MAX_ATTEMPTS` fails within `LOGIN_ATTEMPT_WINDOW_MINUTES`, for `LOGIN_LOCKOUT_MINUTES`. The attempt slot is **reserved atomically before password verification** (r2/P1-2b), so bcrypt runs at most N times per window under concurrency. `req.ip` is trusted only per env-driven **`TRUST_PROXY`** (r2/P1-1b). **Account disable** enforced at login and mid-session (guard revokes the session when the account is disabled). **Initial-credential rotation** via `POST /auth/password` (verifies current password, stores a new bcrypt hash, revokes the admin's *other* sessions). **Security-event log** (`SecurityEvent` append-only collection + structured logger) for login success/failure/blocked, lockout, logout, and password change/failure. |
| **T034C** | `apps/api/test/auth.contract.test.ts` — **11** Mongo-gated HTTP tests booting the full Nest app (see §5), incl. concurrent-bypass and malformed-cookie (r1). |

## 2. Unfinished tasks (later Phase-4 batches — not started)

Batch 2+ (content modules T025–T028C), publish/rollback/audit (T029*), revalidation (T030), admin
dashboard (T031–T033), and the remaining test tasks (T034/T034B/T034D) are **not started** — they
follow in subsequent batches, each with its own checkpoint.

## 3. Files created / modified

- **Created:** `apps/api/src/auth/{auth.schemas.ts, dto.ts, cookies.ts, auth.service.ts, admin.guard.ts,
  csrf.guard.ts, auth.controller.ts, auth.module.ts}`, `apps/api/test/auth.contract.test.ts`.
- **Modified:** `apps/api/src/app.module.ts` (import `AuthModule`), `apps/api/src/main.ts` (r2:
  `trust proxy`), `apps/api/src/config/env.validation.ts`
  (+`LOGIN_MAX_ATTEMPTS`/`LOGIN_LOCKOUT_MINUTES`/`LOGIN_ATTEMPT_WINDOW_MINUTES`; r2 +`TRUST_PROXY` +
  `parseTrustProxy`), `apps/api/.env.example` (throttle + `TRUST_PROXY` vars),
  `specs/001-landing-page/tasks.md`, this handoff.
- **Deleted:** none.

## 4. Technical decisions

- **Server-side sessions, not JWT** (per architecture): logout/disable revoke immediately; the cookie
  holds only an opaque token. TTL index auto-expires; the guard also checks expiry/revocation because
  TTL cleanup is not instantaneous.
- **CSRF = synchronizer token via double-submit transport.** The CSRF token is stored in the session
  (server-side) and returned both in the login body and a **readable** (non-HttpOnly) cookie; the SPA
  echoes it in `x-csrf-token`, which the server verifies against the session token (constant-time).
  Safe methods pass through; `/auth/login` is exempt (no session yet).
- **Throttle + sessions are Mongo-backed** (not in-memory) so they survive restarts and are correct for
  the modular monolith. Throttle is keyed by **username + client IP** and the attempt slot is
  **reserved atomically before the password check** (single aggregation-pipeline update), so bcrypt is
  bounded to `LOGIN_MAX_ATTEMPTS` per window even under concurrency and a lockout binds to the source IP.
- **`req.ip` trust is explicit** via `TRUST_PROXY` → Express `trust proxy` (default: trust none, use the
  socket IP). `X-Forwarded-For` is never blindly trusted; behind a known proxy the operator sets the hop
  count/trusted subnets so the real client IP is used without being spoofable. `TRUST_PROXY=true` (trust
  any XFF) is **rejected at boot in production** (r3) because it would let an attacker spoof a fresh IP
  per request and defeat the per-IP login throttle.
- **Explicit `@Inject(...)` tokens** on class/type-injected constructor params (`ConfigService`,
  `AuthService`) in the auth providers/guards/controller. **Why:** the API test runner is
  `node --import tsx` (esbuild), which does **not** emit `design:paramtypes` decorator metadata, so
  type-based Nest DI resolves to `undefined` under tsx. `@InjectModel` (token-based) already worked;
  adding explicit tokens makes all auth DI metadata-independent, so it works identically under `tsx`
  (tests) and `tsc` (`nest build`, production). This is the convention later admin batches will follow.
- **Password hashing** reuses `bcryptjs` (already used by the seed), cost 10.

## 5. Lint / typecheck / build / test results

- `pnpm -r lint` — **4/4 pass.**
- Builds — `@vyvy/content-types`, `api`, `admin` **pass**. (`web` build needs a live CMS + site URL and
  is unaffected by this batch.)
- API tests **without** Mongo — **18 pass, 14 skipped** (11 auth + 3 seed are Mongo-gated).
- API tests **with** Mongo (`RUN_MONGO_TESTS=1`) — **32/32 pass**, including the 11 auth tests.
- `git diff --check` — clean.

## 6. Integration / end-to-end results

**Mongo-gated HTTP tests** (`auth.contract.test.ts`, full Nest app on an ephemeral port, 11 tests):
unauthenticated `/auth/me` + `/auth/logout` → 401; valid login → session + `/auth/me`; wrong password →
401 then **429 lockout** at the threshold (correct password still refused while locked); **10 concurrent**
wrong-password logins → bcrypt runs ≤3× and ≥7 are refused `429` (no rate-limit bypass, r2); **malformed
cookie** → 401 not 500 (r1);
disabled account → 401; logout revokes (subsequent use → 401); forced-expired session → 401; mid-session
account disable → 401; CSRF missing/wrong → 403, correct → 200; password rotation rejects a wrong
current password (422) and revokes other sessions while keeping the initiating one.

**Live smoke against the built (tsc) API** (isolated `vyvy_authsmoke` DB, `:4100`):
- `POST /auth/login {}` → **400** and unknown-field `{…,"evil":1}` → **400** (`property evil should not
  exist`) — confirms the DTO `ValidationPipe` runs in the production build.
- Valid login → **200** with `Set-Cookie: vyvy_admin_session=… HttpOnly; SameSite=Lax; Max-Age=43200`
  and a readable `vyvy_admin_session_csrf=…` cookie.
- `GET /auth/me` with the cookie → **200 `{username:"admin"}`**.
- Logout without CSRF → **403 `CSRF`**; with CSRF → **200**; `/auth/me` afterwards → **401**.
- Isolated DB dropped, process stopped.

## 7. Blockers / risks / technical debt

- **tsx does not emit decorator metadata** → the `node:test`+`tsx` runner cannot exercise class-validator
  DTO validation through the HTTP pipe (the `metatype` is absent, so the pipe passes values through).
  Mitigations: (a) auth DI is metadata-independent via explicit `@Inject`; (b) DTO validation is verified
  against the **built tsc API** live (400 above); (c) future validation-focused contract tests should
  assert DTOs directly with `class-validator` `validate(plainToInstance(Dto, …))` (property decorators
  like `@IsString`/`@MaxLength` do not need `design:type`), or run under a metadata-emitting runner.
  No production behavior is affected — `nest build` (tsc) emits metadata and validation runs.
- Content/publish/audit modules and the admin dashboard are not yet present; auth guards are ready to
  protect them in the next batches.
- Security events are persisted + logged but there is no read/query endpoint yet (audit surface is
  T029D/`GET /audit`, a later batch).

## 8. Commands for Codex to re-run (verify)

```bash
cd korean-shopping-proxy && corepack pnpm@9.15.4 install
corepack pnpm@9.15.4 -r lint
corepack pnpm@9.15.4 --filter api build
corepack pnpm@9.15.4 --filter api test                      # 18 pass, 14 skipped (no Mongo)
RUN_MONGO_TESTS=1 corepack pnpm@9.15.4 --filter api test    # 32 pass (incl. 11 auth)

# Live auth smoke against the built API (needs Mongo):
MONGO_URI=mongodb://127.0.0.1:27017/vyvy_authverify PORT=4100 corepack pnpm@9.15.4 --filter api seed --force-reset
MONGO_URI=mongodb://127.0.0.1:27017/vyvy_authverify PORT=4100 corepack pnpm@9.15.4 --filter api start &
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://127.0.0.1:4100/auth/login -H 'content-type: application/json' -d '{}'   # 400
curl -s -i -c /tmp/c.txt -X POST http://127.0.0.1:4100/auth/login -H 'content-type: application/json' \
  -d '{"username":"admin","password":"change-me-immediately"}' | grep -i set-cookie   # HttpOnly session + csrf cookie
curl -s -b /tmp/c.txt http://127.0.0.1:4100/auth/me   # {"username":"admin"}
# then drop the isolated DB and stop the process.
```

**Gate:** Batch 1 (Auth) checkpoint reached. **Batch 2 (content modules) not started; stopping for
independent Codex review.**
