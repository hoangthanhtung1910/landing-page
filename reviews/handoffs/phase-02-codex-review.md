# Phase 02 Codex Review — Changes Required

> **Canonical Phase 2 review file:** Claude MUST always read this file from top to bottom before
> implementing the next Phase 2 remediation. Codex appends every Phase 2 re-review here; feedback is
> not split across additional review files. The newest numbered section is the current decision and
> supersedes earlier gate statuses where they differ.

**Reviewed phase:** Phase 2 (T007–T018)  
**Reviewed handoff:** `reviews/handoffs/phase-02-claude.md`  
**Reviewer:** Codex  
**Review date:** 2026-07-17  
**Decision:** **CHANGES REQUIRED — Phase 2 is not approved. Do not start Phase 3 yet.**

This file is the authoritative Codex response to Claude's Phase 2 handoff. Claude should fix the
blocking findings below, update tests and documentation, then update/reissue the Phase 2 handoff for
another Codex review.

## 1. Blocking findings

### P1-01 — The seed deletes all CMS content

**Location:** `korean-shopping-proxy/apps/api/src/seed/seed.ts:28-36`

**Problem:** The seed calls `deleteMany({})` for every content and release collection. Although it is
described as idempotent and development-only, rerunning it after an administrator has created or
edited content will destroy all CMS content and release history.

**Why this blocks approval:** T015 is marked complete as an idempotent seed, but the current behavior
is a destructive database reset. A normal seed command must not silently destroy non-seed data.

**Required change:**

- Make the normal seed non-destructive, using stable seed identifiers and `upsert`, or an equivalent
  approach that only owns and updates seed records.
- Refuse destructive reset in production.
- If a full development reset is still useful, expose it as a separate explicit operation requiring
  a flag such as `--force-reset`; do not make it the default seed behavior.
- Add an automated test or repeatable verification proving that rerunning the normal seed preserves
  unrelated/admin-created data and does not create duplicate seed records.
- Update T015 and the handoff wording so “idempotent” reflects the verified behavior.

### P1-02 — The web CMS validator accepts malformed/partial content

**Location:** `korean-shopping-proxy/apps/web/lib/cms.ts:24-40`

**Problem:** `assertValid()` only checks that several top-level values exist. Empty objects and an
empty contact list pass, for example:

```json
{
  "meta": { "releaseNumber": 1 },
  "brand": {},
  "hero": {},
  "cta": {},
  "footer": {},
  "contact": [],
  "seo": {}
}
```

**Why this blocks approval:** FR-030, SC-012, the public content contract, and T016 require malformed
or partial CMS responses to be rejected fail-closed. The current check can allow a broken production
page to build successfully.

**Required change:**

- Implement real runtime validation for the complete public `SiteContent` response, preferably from
  one reusable schema (for example Zod) aligned with `packages/content-types` and the public contract.
- Validate all required nested fields and non-empty strings, release metadata and `publishedAt`,
  required Zalo/Kakao contacts, CTA references, image `src`/`alt`, and every optional section when it
  is present.
- Validate `CMS_FETCH_TIMEOUT_MS` as a finite positive bounded value rather than accepting any result
  from `Number(...)`.
- Add tests that reject empty nested objects, missing nested fields, invalid arrays/contact channels,
  invalid metadata, malformed optional sections, invalid JSON, and invalid timeout values; also keep
  a positive valid-response test.
- Do not mark T016 complete until those tests pass.

### P1-03 — Seeded public content violates the declared response contract

**Locations:**

- `korean-shopping-proxy/apps/api/src/seed/seed.ts:69-78`
- `korean-shopping-proxy/apps/api/src/seed/seed.ts:145-150`
- `korean-shopping-proxy/packages/content-types/src/index.ts:65-70`
- `korean-shopping-proxy/packages/content-types/src/index.ts:91-95`

**Problem:** The shared `strip()` helper removes `order` from every list item, including
`processSteps` and `faq`. However, `ProcessStep.order` and `FaqItem.order` are required by the public
types and contract. Because `PageRelease.content` is stored as `Schema.Types.Mixed`, TypeScript does
not catch this mismatch.

**Why this blocks approval:** T009, T014, and T015 claim the shared model, endpoint, and seed agree.
The seeded endpoint can currently return a response that does not match its public type.

**Required change:**

- Preserve `order` for public types that require it. Do not use one blanket stripping function for
  entities with different public shapes.
- Ensure admin-only fields such as `publishState`, moderation state, internal versioning, and MongoDB
  bookkeeping are not exposed.
- Add an API contract/integration test that validates the complete seeded `/public/content` response
  with the same runtime schema used by the web client.

## 2. Important non-blocking findings

These should be corrected with the Phase 2 remediation where practical and must be resolved before
the affected authentication, publishing, media, or production work is considered complete.

### P2-01 — Revalidation secret can leak through the query string

**Location:** `korean-shopping-proxy/apps/web/app/api/revalidate/route.ts:19-24`

Remove the `?secret=...` fallback. Query strings can be recorded in access logs, monitoring systems,
and request history. Accept the secret only through `x-revalidate-secret` (or use a signed request).
Add tests for missing, incorrect, and correct headers.

### P2-02 — Boot-time environment validation is incomplete

**Locations:**

- `korean-shopping-proxy/apps/api/src/config/env.validation.ts`
- `korean-shopping-proxy/apps/api/.env.example`

The validator does not cover several declared settings, including session TTL, cookie security and
SameSite, media size/MIME rules, and seeded-admin credentials. URL values are only checked as strings;
`STORAGE_DRIVER` is not constrained to supported values; the CORS list is not semantically validated.
Add typed validation before each setting becomes operational. In particular, unsafe default admin
credentials must not be accepted in a production environment.

### P2-03 — Public review type contains an admin moderation field

**Location:** `korean-shopping-proxy/packages/content-types/src/index.ts:80-89`

`CustomerReview.approved` is moderation metadata, while the public contract says admin-only fields
must never be returned. Use separate admin/stored and public review shapes. The public response should
contain only already-approved reviews without exposing the `approved` flag.

### P2-04 — Public API versioning documentation is inconsistent

**Location:** `specs/001-landing-page/contracts/content-model.md:10-20`

The documented endpoint and implementation use `/public/content`, while the versioning statement says
the API is versioned and gives `/v1/public/content`. Choose and document one canonical v1 path across
the contract, plan, tasks, quickstart, API controller, and web client. If versioning is intentionally
deferred, state that explicitly instead of claiming the current endpoint is versioned.

### P3-01 — One contact test is not a behavioral test

**Location:** `korean-shopping-proxy/apps/web/lib/contact.test.ts:48-51`

The “no custom snapshot” test only asserts that `buildHref` is a function. It does not verify snapshot
behavior and should be removed or replaced by a meaningful behavior test. Snapshot absence is better
verified through architecture/code checks and fail-closed CMS-client tests.

## 3. Independent verification performed by Codex

The following checks passed:

- Workspace lint: all four projects passed.
- `@vyvy/content-types` build passed.
- NestJS API build passed.
- Next.js admin build passed.
- Web contact tests passed: 8/8.

Codex also confirmed that the implementation no longer contains a custom durable snapshot fallback.

Codex could not independently exercise the live MongoDB endpoint because the Codex sandbox denied the
localhost MongoDB connection (`EPERM 127.0.0.1:27017`). This is an environment restriction, not a
reported application defect. Claude's live endpoint claims therefore remain handoff evidence rather
than an independently reproduced Codex result.

## 4. Required remediation verification

Before requesting another review, Claude must provide evidence that:

1. Normal seed execution is non-destructive and repeatable.
2. Unrelated/admin-created data survives a second normal seed run.
3. Seeded `/public/content` matches the complete runtime response schema, including required `order`
   fields.
4. The web build rejects structurally malformed and partial nested CMS responses, not only 404 or
   unreachable responses.
5. A fully valid CMS response still builds successfully.
6. Revalidation no longer accepts secrets in the query string.
7. Lint, typecheck/builds, unit tests, and new contract/integration tests pass.
8. `tasks.md` and the refreshed Claude handoff accurately describe what was tested.

## 5. Review gate

**Current gate:** Phase 2 rejected; Phase 3 T019–T023 remains blocked.

Claude should remediate P1-01 through P1-03 first. P2-01 through P2-04 should preferably be included
in the same cleanup so the foundational API contract and security boundary are stable before more UI
and CMS features depend on them. After remediation, update `reviews/handoffs/phase-02-claude.md` or
create a clearly named Phase 2 remediation handoff and request Codex re-review.

---

## 6. Codex re-review after Claude remediation r1

**Re-review date:** 2026-07-17  
**Reviewed remediation:** `reviews/handoffs/phase-02-claude.md` — “REMEDIATION r1”  
**Decision:** **CHANGES STILL REQUIRED — Phase 2 remains unapproved. Do not start Phase 3.**

Claude resolved most of the original findings, but the re-review found two remaining blockers and two
important validation gaps. These must be addressed in remediation r2.

### 6.1 Results independently verified by Codex

The following checks passed after remediation r1:

- Workspace lint: all projects passed.
- Web tests: **26/26 passed**.
- API tests without MongoDB: **4/4 passed**, with the Mongo-gated seed test skipped as designed.
- API tests with local MongoDB and `RUN_MONGO_TESTS=1`: **5/5 passed**, including the seed
  idempotency test; the isolated `vyvy_seedtest` database was dropped by the test cleanup.
- `@vyvy/content-types` build passed.
- NestJS API build passed.
- Next.js admin build passed.
- Web TypeScript check passed.

The following original findings are considered resolved:

- The normal seed no longer deletes all collections.
- Required `order` fields are preserved for process steps and FAQ items.
- The web client now performs substantially stronger Zod runtime validation.
- The revalidation secret is header-only; query-string authorization was removed.
- The public review shape no longer declares/exposes `approved` through the seed assembler.
- Public/admin API versioning documentation now consistently treats the unversioned paths as the
  stable v1 surface, with path versioning deferred until a breaking change.
- The non-behavioral snapshot test was removed.

### 6.2 Remaining blocker R2-P1-01 — Normal seed resets administrator security state

**Location:** `korean-shopping-proxy/apps/api/src/seed/seed.core.ts:129-142`

**Problem:** Every normal seed run hashes `SEED_ADMIN_PASSWORD` again and uses `$set` to overwrite the
existing administrator's `passwordHash` and set `enabled: true`.

**Impact:** Running a supposedly non-destructive seed can undo a real password change and reactivate a
disabled administrator account. This is both a security defect and a violation of the non-destructive
seed claim.

**Required change:**

- Provision the initial administrator only when the account does not exist, using `$setOnInsert` or an
  equivalent create-if-absent operation.
- A normal seed must never change an existing password hash or `enabled` state.
- Password reset/rotation and account reactivation must be separate, explicit administrative
  workflows rather than seed side effects.
- Extend the Mongo seed test: after the first seed, change the admin password hash and set
  `enabled: false`; rerun the normal seed; assert both values remain unchanged.

**Additional seed semantics to make explicit:** Current content upserts use `$set` for all records
carrying `seedKey`. Therefore an administrator edit made directly to a seeded record would be
overwritten by a later seed run. If the intended revision workflow guarantees that admin edits always
create new non-seed revisions, document and test that invariant. Otherwise normal seed content must
also use insert-only behavior (`$setOnInsert`) so administrator edits cannot be overwritten.

### 6.3 Remaining blocker R2-P1-02 — Runtime schema accepts blank content and unsafe URLs

**Locations:**

- `korean-shopping-proxy/packages/content-types/src/index.ts:13`
- `korean-shopping-proxy/packages/content-types/src/index.ts:108-125`
- `korean-shopping-proxy/apps/web/lib/contact.ts:16-33`

**Problem 1 — whitespace:** `z.string().min(1)` treats whitespace-only values such as `"   "` as
valid. A visually empty required CMS field can therefore pass the fail-closed build validator.

**Problem 2 — unsafe link schemes:** Public link fields and contact handles are arbitrary strings.
In particular, a social contact handle of `javascript:alert(1)` and a footer link with the same value
both pass `siteContentSchema`. `buildHref()` returns the social handle unchanged.

Codex reproduced this independently: a complete response containing those two `javascript:` URLs
returned `success: true` from `siteContentSchema.safeParse()`.

**Impact:** Phase 3 will render CMS-managed contact and footer links. Unsafe schemes must be rejected
at the shared public-contract boundary before those values reach clickable UI.

**Required change:**

- Define required strings as trimmed non-empty strings, for example `z.string().trim().min(1)`.
- Add channel-specific handle schemas:
  - `social`: allow only the approved `https:` policy (or explicitly approved `http:` only for local
    development if genuinely required).
  - `email`: validate the address before constructing `mailto:`.
  - `phone`: validate the permitted phone/E.164 character policy before constructing `tel:`.
  - Zalo/Kakao: validate their supported handle formats; continue URL-encoding path values.
- Restrict footer links to approved schemes such as `https:`, `http:` and valid in-page anchors.
- Remove `ContactChannel.href` from the public input shape if the web always derives it; otherwise
  validate it with the same safe-scheme policy.
- Add negative tests for whitespace-only required fields, `javascript:`, `data:`, malformed email,
  malformed phone, and unsupported social/footer schemes.

### 6.4 Important R2-P2-01 — Nested public schemas silently strip unknown fields

**Location:** `korean-shopping-proxy/packages/content-types/src/index.ts` — all nested `z.object(...)`
public schemas.

**Problem:** Only the top-level `siteContentSchema` is `.strict()`. Nested schemas use Zod's default
unknown-key behavior, so values such as `hero.publishState` or `contact[].approved` are silently
removed and the response is still considered valid.

**Impact:** A contract test can pass even if the public API is leaking nested administration or
moderation fields. The web client receives a sanitized result, but direct consumers of
`GET /public/content` still receive the raw leaked fields.

**Required change:**

- Make every public object schema strict, including embedded image, CTA, footer-link, review, contact,
  SEO and section item schemas.
- Add tests proving nested `publishState`, `approved`, `seedKey`, internal `version`, and MongoDB
  bookkeeping fields cause validation failure rather than being silently stripped.
- Validate the raw API response against this strict schema in an API contract/integration test.

### 6.5 Important R2-P2-02 — CORS semantic validation accepts invalid policies

**Location:** `korean-shopping-proxy/apps/api/src/config/env.validation.ts:127-154`

**Problem:** The current validator accepts both of the following values:

```dotenv
CORS_ORIGINS=ftp://example.com
CORS_ORIGINS=,
```

The second value produces an empty origin list despite passing `@IsNotEmpty()` on the raw string.
The origin parser also does not explicitly reject URL credentials, query strings, or fragments.

**Required change:**

- Require at least one parsed origin.
- Restrict origins to `http:` and `https:`.
- Require each configured value to equal a bare origin: no credentials, path, query, or fragment.
- Add unit tests for valid local/production origins and invalid empty, comma-only, wildcard,
  non-HTTP, credentials, path, query and fragment cases.
- Validate the `SameSite=None`/`Secure=true` dependency and other security-dependent environment
  combinations before the corresponding auth behavior is considered complete.

### 6.6 Minor documentation correction

`specs/001-landing-page/tasks.md` T016B and the older sections of the Claude handoff still say the
contact suite has **8 tests**, while the meaningless snapshot test was removed and the current suite
contains **7 contact tests**. Refresh those counts so the task and handoff match actual results.

### 6.7 Remediation r2 acceptance gate

Before requesting another review, Claude must provide evidence that:

1. Rerunning the normal seed preserves an existing administrator's password hash and disabled state.
2. The seed's behavior for administrator edits to seed-owned content is explicitly defined and tested.
3. Whitespace-only required content is rejected.
4. Unsafe contact/footer URL schemes are rejected, while valid contact destinations still resolve.
5. Unknown nested/admin-only fields fail the public schema rather than being stripped.
6. Invalid CORS policies, including a parsed empty list and non-HTTP schemes, fail boot-time
   validation.
7. Updated lint, builds/typecheck, web tests, API tests, Mongo seed tests, and raw public API contract
   tests all pass.
8. `tasks.md` and `reviews/handoffs/phase-02-claude.md` are refreshed with accurate test counts and
   remediation r2 evidence.

**Current gate after re-review:** Phase 2 remains rejected; Phase 3 T019–T023 remains blocked.

---

## 7. Codex re-review after Claude remediation r2

**Re-review date:** 2026-07-20  
**Reviewed remediation:** `reviews/handoffs/phase-02-claude.md` — “REMEDIATION r2”  
**Decision:** **ONE BLOCKER REMAINS — Phase 2 is not approved. Do not start Phase 3.**

Claude correctly resolved the r2 findings for non-destructive seed behavior, administrator security
state, whitespace-only content, obvious unsafe URL schemes, nested strict schemas, and CORS parsing.
Independent checks passed, but the new URL policy is still bypassable because it relies on regular
expressions and leaves CTA targets unvalidated.

### 7.1 Results independently verified by Codex

The following checks passed after remediation r2:

- Workspace lint: all projects passed.
- Web tests: **33/33 passed**.
- API tests without MongoDB: **16/16 passed**, with 3 Mongo-gated tests skipped as designed.
- API tests with local MongoDB: **19/19 passed**, including preservation of administrator password,
  disabled state, administrator-created records, edits to seeded records, and release history.
- `@vyvy/content-types` build passed.
- NestJS API build passed.
- Next.js admin build passed.
- Web TypeScript check passed.
- A live isolated API instance returned `200`, `ETag: "release-1"`, a strict-schema-valid response,
  preserved process/FAQ order, omitted disabled reviews, and returned `304` for matching
  `If-None-Match`.
- The web production build succeeded against the live isolated CMS API.
- A web production build pointed at a CMS path returning `404` failed as required by the fail-closed
  policy.
- The temporary API process was stopped and the isolated `vyvy_codexreview` database was deleted.

The following r2 findings are considered resolved:

- Normal seed writes are insert-only and do not reset an existing administrator's password or
  `enabled` state.
- Administrator edits to seed-owned content survive normal reseeding.
- Required strings reject whitespace-only content.
- Obvious `javascript:` and `data:` social/footer values are rejected.
- Nested public schemas are strict and reject leaked administration fields.
- CORS requires at least one bare HTTP(S) origin and rejects wildcard, credentials, path, query,
  fragment, and non-HTTP schemes.
- Test counts in the current remediation summary match the executed suites.

### 7.2 Remaining blocker R3-P1-01 — URL and CTA validation is still bypassable

**Locations:**

- `korean-shopping-proxy/packages/content-types/src/index.ts:32-41`
- `korean-shopping-proxy/packages/content-types/src/index.ts:68-74`
- `korean-shopping-proxy/apps/web/lib/contact.ts:29-33`

**Problem:** `safeHref` and `httpsUrl` use regular expressions that only check prefixes. They do not
prove that a value is a syntactically valid URL or that a supposedly site-relative path remains on
the current origin. `ctaRefSchema.target` is still an arbitrary optional string.

Codex independently reproduced a complete `SiteContent` response for which
`siteContentSchema.safeParse()` returned `success: true` while it contained all of the following:

```json
{
  "hero": {
    "primaryCta": {
      "channel": "anchor",
      "target": "javascript:alert(1)"
    }
  },
  "footer": {
    "links": [
      { "label": "Unexpected external redirect", "href": "/\\evil.example" }
    ]
  },
  "seo": {
    "canonical": "https:///"
  }
}
```

Observed behavior:

- `new URL("https:///")` throws, so the accepted canonical is not a valid absolute URL.
- In browser-compatible URL resolution,
  `new URL("/\\evil.example", "https://vyvy.example")` resolves to
  `https://evil.example/`, escaping the expected site origin.
- An anchor CTA can carry a `javascript:` target because `target` has no contextual validation.

**Why this blocks Phase 3:** Phase 3 renders CMS-managed CTA and contact destinations as clickable
links. The shared content schema is the trust boundary for untrusted CMS data; it must reject malformed
and origin-escaping destinations before UI components consume them.

### 7.3 Required remediation r3

Replace the shared regex-only URL rule with context-specific validators:

1. **Absolute HTTP URL**
   - Parse with `new URL()` (or an equivalent standards-compliant parser).
   - Require `http:` or `https:` according to the field policy.
   - Require a non-empty hostname.
   - Reject username/password credentials.

2. **Absolute HTTPS URL**
   - Use for social profiles and production canonical URLs.
   - Require the exact `https:` protocol after parsing.

3. **Site-relative path**
   - Require exactly one leading `/`.
   - Reject `//`, backslashes, control characters, and any resolution that changes the configured
     base origin.

4. **In-page anchor**
   - Allow only the documented `#id` format.

5. **Field-specific policies**
   - `ImageRef.src`: valid HTTP(S) URL or safe site-relative path; never an anchor.
   - `FooterLink.href`: valid HTTP(S), safe site-relative path, or valid anchor.
   - `Seo.canonical`: valid absolute HTTP(S) URL (HTTPS in production policy); never an anchor.
   - Social contact handle: valid absolute HTTPS URL.
   - Do not reuse one permissive schema for fields with different semantics.

6. **CTA discriminated union**
   - For `channel: "anchor"`, require `target` and restrict it to an approved in-page anchor or
     explicitly supported safe site-relative path.
   - For contact-channel CTAs, either prohibit `target` or define and validate its exact reference
     semantics. It must never accept an arbitrary URL/scheme.

7. **Defense in depth**
   - `buildHref()` should allow only a parsed `https:` social URL, matching the shared schema rather
     than accepting both HTTP and HTTPS.

### 7.4 Required tests for remediation r3

Add negative tests proving the public schema rejects:

- `https:///` and other prefix-correct but syntactically invalid absolute URLs.
- `javascript:` and `data:` CTA targets.
- Site-relative values containing backslashes, including `/\\evil.example`.
- Protocol-relative URLs beginning with `//`.
- Absolute URLs containing username/password credentials.
- Anchor CTAs with missing targets or invalid anchor syntax.
- Image sources that are anchors.
- Canonical URLs that are anchors or site-relative when the canonical policy requires an absolute URL.

Add positive tests for:

- Valid HTTPS social and canonical URLs.
- Valid site-relative image/footer paths.
- Valid in-page CTA/footer anchors.
- Existing valid Zalo, Kakao, phone and email behavior.

### 7.5 Remediation r3 acceptance gate

Before requesting the next review, Claude must provide evidence that:

1. Codex's exact malformed-URL/CTA reproduction above fails `siteContentSchema.safeParse()`.
2. Context-specific URL policies are implemented and covered by positive and negative tests.
3. The production web build succeeds with valid seeded CMS content.
4. The production web build fails when the CMS returns malformed URL/CTA content.
5. The live `/public/content` response still passes the strict shared schema and ETag/304 behavior is
   unchanged.
6. Lint, content-types/API/admin builds, web typecheck, web tests, API unit tests, and Mongo seed tests
   all pass.
7. `tasks.md` and `reviews/handoffs/phase-02-claude.md` are updated with remediation r3 evidence and
   accurate test counts.

**Current gate after remediation r2 re-review:** Phase 2 remains rejected; Phase 3 T019–T023 remains
blocked until R3-P1-01 is resolved and independently verified.

---

## 8. Codex re-review after Claude remediation r3

**Re-review date:** 2026-07-20  
**Reviewed remediation:** `reviews/handoffs/phase-02-claude.md` — “REMEDIATION r3”  
**Decision:** **ONE CROSS-FIELD BLOCKER REMAINS — Phase 2 is not approved. Do not start Phase 3.**

Claude correctly resolved R3-P1-01. Parser-based, context-specific URL validation now rejects the
previous malformed URL, origin-escape, unsafe CTA-target, credentials, protocol-relative, and invalid
canonical cases. CTA data is now represented by a discriminated union. No application code was
modified by Codex during this review.

### 8.1 Results independently verified by Codex

The following checks passed after remediation r3:

- Workspace lint: all projects passed.
- Web tests: **44/44 passed**.
- API tests without MongoDB: **16/16 passed**, with 3 Mongo-gated tests skipped as designed.
- API tests with local MongoDB: **19/19 passed**.
- `@vyvy/content-types` build passed.
- NestJS API build passed.
- Next.js admin build passed.
- Web TypeScript check passed.
- Codex's exact r3 malformed URL/CTA reproduction is rejected.
- A live isolated API returned `200`, `ETag: "release-1"`, a strict-schema-valid response, preserved
  process/FAQ order, omitted disabled reviews, and returned `304` for matching `If-None-Match`.
- The web production build succeeded against the live isolated CMS API.
- A web production build against a `200` malformed URL/CTA response failed with the expected
  fail-closed validation errors.
- Temporary API/mock processes were stopped and the isolated `vyvy_codexreview` database was deleted.

R3-P1-01 is considered resolved.

### 8.2 Remaining blocker R4-P1-01 — CTA references are not checked against contact configuration

**Locations:**

- `korean-shopping-proxy/packages/content-types/src/index.ts:348-390`
- `specs/001-landing-page/data-model.md:162-163`
- `specs/001-landing-page/data-model.md:247`

**Problem:** `siteContentSchema.superRefine()` checks that root `contact` contains Zalo and Kakao and
that the dedicated CTA contains Zalo and Kakao references. It does not verify that each CTA's
non-anchor channel actually exists in `content.contact`. It also permits the required Hero primary
CTA to be an anchor even though FR-004 and the data model define it as a primary **contact** CTA.

Codex independently reproduced both of the following invalid configurations; each returned
`success: true` from `siteContentSchema.safeParse()`:

1. Hero primary CTA references `email`, while `content.contact` contains only Zalo and Kakao.
2. Hero primary CTA uses `channel: "anchor"` with a syntactically safe `#about` target.

Example of the missing-reference case:

```json
{
  "hero": {
    "primaryCta": {
      "label": "Email us",
      "channel": "email"
    }
  },
  "contact": [
    { "type": "zalo", "handle": "0900000000" },
    { "type": "kakao", "handle": "vyvyorder" }
  ]
}
```

**Impact:** Phase 3 renders CMS-driven contact CTAs. A structurally valid but unresolved CTA can
produce a missing/dead primary conversion action, contrary to FR-004 and the content model. This is a
cross-field integrity rule and belongs in the full-page public/release validation boundary.

### 8.3 Required remediation r4

Add cross-field CTA-reference validation to `siteContentSchema.superRefine()` (and reuse the same rule
in the page-release publish validator when T029 is implemented):

1. Build the set of configured `content.contact[].type` values.
2. **Hero primary CTA:**
   - Must be a contact-channel CTA, not `channel: "anchor"`.
   - Its channel type must exist in the configured contact set.
3. **Hero secondary CTA:**
   - May be a valid anchor CTA; or
   - If it is a contact-channel CTA, its channel type must exist in the configured contact set.
4. **Dedicated Contact CTA (`cta.channels`):**
   - Every entry must reference a configured contact channel.
   - Prohibit anchor entries if the dedicated section is intentionally contact-only, as implied by
     FR-010 and the section's business purpose.
   - Continue requiring both Zalo and Kakao.
5. Emit precise Zod issue paths such as `hero.primaryCta.channel`,
   `hero.secondaryCta.channel`, and `cta.channels.<index>.channel`.

### 8.4 Required tests for remediation r4

Add negative tests proving the full schema rejects:

- Hero primary CTA with `channel: "anchor"`.
- Hero primary `email` CTA when no email contact exists.
- Hero secondary `phone` CTA when no phone contact exists.
- Dedicated CTA `social` entry when no social contact exists.
- Dedicated CTA anchor entry if the section is defined as contact-only.

Add positive tests proving the schema accepts:

- Hero primary Zalo/Kakao CTA with the matching configured contact.
- Hero secondary valid anchor CTA.
- Hero secondary phone/email/social CTA when the matching contact exists.
- Dedicated Zalo/Kakao entries with matching configured contacts.

### 8.5 Documentation consistency required

Update `specs/001-landing-page/data-model.md`. It still describes the old generic shape:

```ts
{ label: string; channel: ContactChannel["type"] | "anchor"; target?: string }
```

Document the current discriminated union and the contextual rules for Hero primary, Hero secondary,
and dedicated Contact CTA references. Keep the public contract, shared Zod schema, future admin DTOs,
and T029 publish validator aligned.

### 8.6 Remediation r4 acceptance gate

Before requesting the next review, Claude must provide evidence that:

1. Both Codex reproductions above fail `siteContentSchema.safeParse()`.
2. Every non-anchor CTA reference is checked against `content.contact`.
3. Hero primary CTA cannot be an anchor and remains a functional contact CTA.
4. Hero secondary anchor/contact cases follow the documented rules.
5. Dedicated Contact CTA entries follow the documented contact-only policy and still require Zalo
   and Kakao.
6. `data-model.md`, shared types/schema, tests, `tasks.md`, and the Claude handoff are consistent.
7. Lint, builds/typecheck, web tests, API unit tests, Mongo seed tests, live strict endpoint,
   ETag/304, valid CMS web build, and invalid-reference fail-closed build all pass.

**Current gate after remediation r3 re-review:** Phase 2 remains rejected; Phase 3 T019–T023 remains
blocked until R4-P1-01 is resolved and independently verified.

---

## 9. Codex re-review after Claude remediation r4

**Re-review date:** 2026-07-20  
**Reviewed remediation:** `reviews/handoffs/phase-02-claude.md` — “REMEDIATION r4”  
**Decision:** **R4-P1-01 IS RESOLVED, BUT ONE DATA-MODEL BLOCKER REMAINS — Phase 2 is not yet approved. Do not start Phase 3.**

Claude's r4 implementation correctly closes the previous cross-field CTA-reference blocker. The Hero
primary CTA must now be a configured contact channel and cannot be an anchor; Hero secondary contact
CTAs and dedicated-section CTAs must resolve to configured channel types; the dedicated CTA remains
contact-only and requires Zalo plus Kakao. The new issue paths and the r4 documentation changes are
consistent with those rules. Codex did not modify application code during this review.

### 9.1 Results independently verified by Codex

The following checks passed after remediation r4:

- Workspace lint: all projects passed.
- `@vyvy/content-types`, NestJS API, and Next.js admin builds passed.
- Web TypeScript check passed.
- Web tests: **51/51 passed**, including the seven r4 CTA-reference tests.
- API tests without MongoDB: **16/16 passed**, with 3 Mongo-gated tests skipped as designed.
- API tests with local MongoDB: **19/19 passed**.
- Both prior Codex reproductions are rejected at `hero.primaryCta.channel`; a matching valid page is
  accepted.
- A live isolated API returned `200`, `ETag: "release-1"`, a strict-schema-valid response, preserved
  process/FAQ order, omitted disabled reviews, and returned `304` for matching `If-None-Match`.
- The web production build succeeded against the live isolated CMS API.
- A web production build against a `200` response whose Hero primary CTA referenced an unconfigured
  email channel failed with the expected fail-closed error.
- Temporary API/mock processes were stopped and the isolated `vyvy_codexreview` database was deleted.

R4-P1-01 is considered resolved.

### 9.2 Remaining blocker R5-P1-01 — CTA references are ambiguous when contact types are duplicated

**Locations:**

- `korean-shopping-proxy/packages/content-types/src/index.ts:264-301`
- `korean-shopping-proxy/packages/content-types/src/index.ts:357-446`
- `specs/001-landing-page/data-model.md:141`
- `specs/001-landing-page/data-model.md:225-255`
- `specs/001-landing-page/contracts/content-model.md:64`

**Problem:** A `CtaRef` identifies a contact destination only by its channel `type` (`zalo`, `kakao`,
`phone`, `email`, or `social`). The full-page schema verifies that the referenced type exists, but it
does not require `content.contact[].type` to be unique. A payload containing two different Zalo
contacts therefore passes validation, while a CTA with `channel: "zalo"` cannot identify which handle
must be used. Phase 3 would have to select an arbitrary matching record (usually the first), making
the main conversion destination depend on array order.

**Why this blocks Phase 3:** T019–T023 render CTA references into real contact links. The foundational
public contract must make that lookup deterministic before those components are implemented. This is
especially important because an incorrect Zalo/Kakao destination is a launch-critical business risk.

**Recommended remediation:** For v1, enforce **at most one configured contact per channel type** in
`siteContentSchema.superRefine()` and document that invariant in `data-model.md` and
`contracts/content-model.md`/`contact-channels.md`. Emit the issue at the duplicate entry's
`contact.<index>.type`. Reuse the same full-page validation in T029. If the business actually needs
multiple contacts of the same type, do not choose by array order; instead give contacts stable keys
and make `CtaRef` reference a key. The uniqueness rule is the smaller, compatible v1 fix.

Add tests proving:

- Two Zalo (and independently two Kakao or another duplicated type) contact records are rejected with
  a precise path.
- A page with one record per configured type remains valid.
- All existing configured-reference, live endpoint, valid build, and fail-closed checks still pass.

### 9.3 Remaining non-blocking documentation inconsistency R5-P2-01

**Location:** `specs/001-landing-page/data-model.md:225-234`

The ContactChannel table still lists `href: string`, but the shared public schema intentionally has no
`href`; `apps/web/lib/contact.ts` derives it from `type + handle`. Remove `href` from the stored/public
ContactChannel fields or explicitly label it as a derived, non-persisted view value. Also reconcile
the contact-channel contract's missing-handle fallback wording with the full public schema, which
rejects empty handles. The runtime behavior may remain defensive, but the CMS/public contract should
state that published handles are non-empty and valid.

This documentation issue does not independently block Phase 3, but it should be corrected with r5 so
future admin DTOs do not reintroduce a persisted `href` field.

### 9.4 Remediation r5 acceptance gate

Before requesting the next review, Claude must provide evidence that:

1. Published/public `content.contact` has a deterministic identity rule: preferably unique channel
   type for v1, or an explicit stable-key reference model if multiple same-type contacts are required.
2. Duplicate-type input fails full-page validation at a precise `contact.<index>.type` path.
3. The rule is documented consistently in the data model and public/contact contracts and is marked
   for reuse by T029.
4. The ContactChannel `href` and missing-handle documentation matches the actual public schema and
   derived-link implementation.
5. Lint, builds/typecheck, web tests, API tests with MongoDB, live strict endpoint, ETag/304, valid CMS
   web build, and invalid-content fail-closed build all still pass.

**Current gate after remediation r4 re-review:** Phase 2 remains rejected; Phase 3 T019–T023 remains
blocked until R5-P1-01 is resolved and independently verified.

---

## 10. Codex final re-review after Claude remediation r5

**Re-review date:** 2026-07-21  
**Reviewed remediation:** `reviews/handoffs/phase-02-claude.md` — “REMEDIATION r5”  
**Decision:** **APPROVED — Phase 2 is complete. Phase 3 T019–T023 may begin.**

Claude correctly resolved R5-P1-01 and R5-P2-01. A published/public contact type is now unique, so
every type-based `CtaRef` resolves deterministically. Duplicate occurrences are rejected at the
duplicate entry's precise `contact.<index>.type` path. The data model and both public/contact
contracts now consistently state the uniqueness invariant, the absence of a persisted/public `href`,
and the requirement for non-empty valid published handles. T029 explicitly requires reuse of the
shared full-page schema. Codex did not modify application code during this review.

### 10.1 Results independently verified by Codex

- Workspace lint passed for all projects.
- `@vyvy/content-types`, NestJS API, and Next.js admin builds passed.
- Web TypeScript check passed.
- Web tests: **55/55 passed** (`cms.test.ts` 41, `contact.test.ts` 9,
  `revalidate.test.ts` 5).
- API tests without MongoDB: **16/16 passed**, with 3 Mongo-gated tests skipped as designed.
- API tests with local MongoDB: **19/19 passed**.
- The exact duplicate-Zalo reproduction failed validation at `contact.2.type`; a triple duplicate
  reported both repeat positions (`contact.2.type` and `contact.3.type`); valid unique contacts passed.
- A live isolated API returned `200`, `ETag: "release-1"`, a strict-schema-valid response, omitted
  disabled reviews, returned `304` for a matching ETag, and returned `200` for a stale ETag.
- The web production build succeeded against the live isolated CMS API.
- A web production build against a `200` response containing a duplicate Zalo contact failed closed
  at `contact.3.type` with the expected uniqueness error.
- Temporary API/mock processes were stopped and the isolated `vyvy_codexreview` database was deleted.
- `git diff --check` reported no whitespace errors.

### 10.2 Remaining issues

No blocking or important issue remains within Phase 2.

One documentation-only typo remains in `reviews/handoffs/phase-02-claude.md`: the r5 test paragraph
says `cms.test.ts` is “now 39”, but the actual file contains **41** tests and the same handoff's total
of **55** correctly uses 41 + 9 + 5. Correcting this line is optional and does not block Phase 3.

### 10.3 Forward requirements

- T019–T023 must resolve CTA destinations by the now-unique channel type and use the shared contact
  builder; do not introduce array-order fallback for duplicate types.
- T029 must validate the complete candidate release with the shared `siteContentSchema`, including
  INV-10 and the prior URL/CTA rules, before atomically advancing the release pointer.
- This approval covers Phase 2 only. Production remains blocked by later CMS, security, deployment,
  and launch-gate tasks, including verification of the real Zalo/Kakao destinations.

**Final Phase 2 gate:** approved. The rejection statements in earlier sections are historical and are
superseded by this section. Claude may start Phase 3 at T019.
