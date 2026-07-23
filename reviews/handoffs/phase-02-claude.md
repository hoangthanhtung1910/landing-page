# Phase 02 Handoff — Foundational (Data Layer + Public API + Web Client)

**Phase:** 2 (Foundational, tasks T007–T018)
**Completed:** 2026-07-17 · **Remediation r1/r2:** 2026-07-17 · **r3:** 2026-07-20 · **r4:** 2026-07-20 · **r5:** 2026-07-21 (responds to `phase-02-codex-review.md` §9)
**Author:** Claude (handoff claim — Codex verifies independently)
**Prev checkpoint:** Phase 1 (`phase-01-claude.md`)

---

## REMEDIATION r5 — response to Codex re-review §9 (blocker R5-P1-01 + doc R5-P2-01)

**Blocker R5-P1-01 — CTA references ambiguous when contact types are duplicated.** A `CtaRef` addresses
a contact destination by channel `type` alone, but the full-page schema did not require
`content.contact[].type` to be unique — two same-type records would make the CTA target depend on array
order. Fixed by enforcing **at most one configured contact per channel type** in
`siteContentSchema.superRefine()` (`packages/content-types/src/index.ts`), the same shared validator
reused by the T029 publish path. This is documented as invariant **INV-10 (deterministic contact
identity)**.

**Rules implemented (§9.2 point-by-point):**
1. `siteContentSchema.superRefine()` tracks the first index seen per `type`; any later record of an
   already-seen type is an error. This runs on the same full-page validation reused by T029.
2. The issue is emitted at the duplicate entry's **`contact.<index>.type`** path, message:
   `duplicate contact channel type "<type>" (already configured at contact[<first>]); each channel type may appear at most once`.
3. Every repeated occurrence is flagged (not just the second), so a triple would report both extras.

**Tests (§9.2)** — added 4 to `apps/web/lib/cms.test.ts` (now **41**; web total **55**):
- reject two `zalo` contacts → issue at `contact.2.type` (duplicate-zalo message).
- reject two `kakao` contacts → issue at `contact.2.type` (duplicate-kakao message).
- reject a duplicated non-required type (two `social`) → issue at `contact.3.type`.
- accept one record per configured type (zalo, kakao, phone, email, social — all five) → parses.

**Doc R5-P2-01 — ContactChannel `href` + missing-handle wording.** The stored/public `ContactChannel`
has **no `href`**; the web app derives the link at render time from `type` + `handle`
(`apps/web/lib/contact.ts`). Published handles are **non-empty and valid** for their channel type — the
public schema rejects empty/malformed handles, so `buildHref`'s `#` placeholder branch is a defensive
runtime guard for not-yet-configured/preview states, not a state published data can reach.

**Docs synced (§9.4 point 3–4):**
- `data-model.md`: removed the `href` row from the ContactChannel table (added an explicit "no
  stored/public `href`; derived at render time" note); marked `type` unique (INV-10) and `handle`
  non-empty/valid; updated the aggregate `contact` row and the CtaRef cross-field-integrity note.
- `contracts/content-model.md`: added **INV-10**; annotated `contact: ContactChannel[]` as type-unique.
- `contracts/contact-channels.md`: `href` is a derived, non-persisted view value (admin DTOs must not
  persist it); added the INV-10 uniqueness note; rewrote Rule R-3 so published content never carries an
  empty handle and the `#` branch is documented as a defensive guard.
- `tasks.md`: T016 and T029 note the INV-10 uniqueness rule (shared validator, `contact.<index>.type`).

**Acceptance-gate evidence (§9.4):**
1. Deterministic identity rule chosen for v1: **unique channel type** in `content.contact` (INV-10).
2. Duplicate-type input fails full-page validation at a precise `contact.<index>.type` path (tests +
   live fail-closed build below).
3. Documented consistently across data model + both contracts + `tasks.md`; marked for T029 reuse.
4. ContactChannel `href`/missing-handle docs now match the shared schema and derived-link impl.
5. Lint 4/4 · content-types/api/admin builds OK · web tests **55/55** (contact 9 + cms 41 + revalidate 5)
   · api tests **16/16** without Mongo (3 gated skipped) and **19/19** with Mongo · live `/public/content`
   strict-valid, `ETag "release-1"`, `If-None-Match` match → **304** / stale → **200** · web build with
   valid CMS **exit 0** · web build against a 200 response carrying a duplicate `zalo` contact **exit 1**:
   `fail-closed): contact.3.type: duplicate contact channel type "zalo" (already configured at contact[0]); each channel type may appear at most once`.

**Files changed in r5:** `packages/content-types/src/index.ts` (uniqueness superRefine + doc comment),
`apps/web/lib/cms.test.ts` (+4 tests, import `safeParseSiteContent`),
`specs/001-landing-page/data-model.md`, `specs/001-landing-page/contracts/content-model.md`,
`specs/001-landing-page/contracts/contact-channels.md`, `specs/001-landing-page/tasks.md`, this handoff.

### §9bis — r5 verification commands for Codex

```bash
cd korean-shopping-proxy && corepack pnpm@9.15.4 install
corepack pnpm@9.15.4 -r lint
corepack pnpm@9.15.4 --filter @vyvy/content-types build && corepack pnpm@9.15.4 --filter api build && corepack pnpm@9.15.4 --filter admin build
corepack pnpm@9.15.4 --filter web typecheck
corepack pnpm@9.15.4 --filter web test    # 55 pass (contact 9 + cms 41 + revalidate 5)
corepack pnpm@9.15.4 --filter api test     # 16 pass, 3 Mongo-gated skipped
RUN_MONGO_TESTS=1 MONGO_TEST_URI=mongodb://127.0.0.1:27017/vyvy_seedtest corepack pnpm@9.15.4 --filter api test  # 19 pass

# R5 repro must FAIL + valid must PASS (run from apps/web so tsx resolves):
cd apps/web && node --import tsx -e '
import { siteContentSchema } from "@vyvy/content-types";
const base = () => ({meta:{releaseNumber:1,publishedAt:new Date().toISOString()},brand:{name:"V",slogan:"S"},
hero:{headline:"H",subheadline:"S",primaryCta:{label:"Zalo",channel:"zalo"}},
cta:{headline:"C",channels:[{label:"Z",channel:"zalo"},{label:"K",channel:"kakao"}]},
footer:{contactSummary:"s",links:[],copyright:"c"},
contact:[{type:"zalo",label:"Z",handle:"0900000000",icon:"i",external:true},{type:"kakao",label:"K",handle:"vyvyorder",icon:"i",external:true}],
seo:{title:"t",description:"d"}});
const dup = base(); dup.contact.push({type:"zalo",label:"Z2",handle:"0911111111",icon:"i",external:true});
const r = siteContentSchema.safeParse(dup);
console.log("dup accepted?", r.success); // false
if(!r.success) console.log("path:", r.error.issues.find(i=>/duplicate contact channel type/.test(i.message))?.path.join("."));
console.log("valid accepted?", siteContentSchema.safeParse(base()).success); // true
'
# Live endpoint + builds: seed --force-reset an isolated DB, start API, strict-validate + ETag/304,
# web build success with CMS up; then a mock 200 whose contact has two "zalo" records must exit 1
# with "fail-closed): contact.<i>.type: duplicate contact channel type \"zalo\" ...".
```

---

## REMEDIATION r4 — response to Codex re-review §8 (blocker R4-P1-01)

Single blocker: CTA references were not checked against the configured `contact` list, and the hero
primary CTA could be an anchor. Fixed with **cross-field CTA-reference integrity** in
`siteContentSchema.superRefine()` (`packages/content-types/src/index.ts`) — the rule will be reused by
the T029 page-release publish validator.

**Rules implemented (§8.3 point-by-point):**
1. The configured set is built from `content.contact[].type`.
2. **Hero primaryCta**: must be a contact-channel CTA (anchor → issue at `hero.primaryCta.channel`,
   message cites FR-004); its channel type must exist in the configured set.
3. **Hero secondaryCta**: valid anchor CTA allowed; a contact-channel CTA must reference a configured
   type (issue at `hero.secondaryCta.channel`).
4. **Dedicated Contact CTA**: contact-only — anchor entries rejected (FR-010); every entry must
   reference a configured type (issue at `cta.channels.<i>.channel`); Zalo + Kakao still required.
5. Precise Zod issue paths as specified.

**Tests (§8.4)** — added 7 to `apps/web/lib/cms.test.ts` (now **37**; web total **51**):
negative — anchor primary CTA; email primary with no email contact (Codex repro); secondary phone with
no phone contact; dedicated `social` entry with no social contact; dedicated anchor entry.
positive — primary zalo/kakao with matching contact; secondary anchor; secondary phone/email/social
when the matching contact exists.

**Docs (§8.5)** — `data-model.md` updated: CtaRef documented as the discriminated union (anchor CTA
requires safe target; contact CTA has no `target` key) + contextual rules for hero primary/secondary
and the contact-only dedicated section; Hero and ContactCTA tables updated to match.

**Acceptance-gate evidence (§8.6):**
1. Both Codex repros fail `safeParse`:
   `repro1 (email primary, unconfigured) → false` at `hero.primaryCta.channel` ("references channel
   \"email\" which is not configured in contact"); `repro2 (anchor primary) → false` at
   `hero.primaryCta.channel` ("must be a contact-channel CTA, not an anchor (FR-004)").
2–5. Enforced by the superRefine rules + tests above; valid configuration still parses (`true`).
6. `data-model.md`, shared schema, tests, `tasks.md` (T016), and this handoff are consistent.
7. Lint 4/4 · content-types/api/admin builds OK · web tests **51/51** (contact 9 + cms 37 + revalidate 5)
   · api tests **19/19** with Mongo · live `/public/content` strict-valid, `ETag "release-1"`, 304 OK ·
   web build with valid CMS **exit 0** · web build against a 200 response whose hero primary CTA
   references an unconfigured channel **exit 1** — `fail-closed): hero.primaryCta.channel: hero primary
   CTA references channel …`.

**Files changed in r4:** `packages/content-types/src/index.ts` (cross-field superRefine),
`apps/web/lib/cms.test.ts` (+7 tests), `specs/001-landing-page/data-model.md`,
`specs/001-landing-page/tasks.md`, this handoff.

### §8quater — r4 verification commands for Codex

```bash
cd korean-shopping-proxy && corepack pnpm@9.15.4 install
corepack pnpm@9.15.4 -r lint
corepack pnpm@9.15.4 --filter @vyvy/content-types build && corepack pnpm@9.15.4 --filter api build && corepack pnpm@9.15.4 --filter admin build
corepack pnpm@9.15.4 --filter web test    # 51 pass (contact 9 + cms 37 + revalidate 5)
RUN_MONGO_TESTS=1 MONGO_TEST_URI=mongodb://127.0.0.1:27017/vyvy_seedtest corepack pnpm@9.15.4 --filter api test  # 19 pass

# R4 repros must FAIL (run from apps/web so tsx resolves):
cd apps/web && node --import tsx -e '
import { siteContentSchema } from "@vyvy/content-types";
const base = () => ({meta:{releaseNumber:1,publishedAt:new Date().toISOString()},brand:{name:"V",slogan:"S"},
hero:{headline:"H",subheadline:"S",primaryCta:{label:"Zalo",channel:"zalo"}},
cta:{headline:"C",channels:[{label:"Z",channel:"zalo"},{label:"K",channel:"kakao"}]},
footer:{contactSummary:"s",links:[],copyright:"c"},
contact:[{type:"zalo",label:"Z",handle:"0900000000",icon:"i",external:true},{type:"kakao",label:"K",handle:"vyvyorder",icon:"i",external:true}],
seo:{title:"t",description:"d"}});
const r1c = base(); r1c.hero.primaryCta = {label:"Email us",channel:"email"};
const r2c = base(); r2c.hero.primaryCta = {label:"About",channel:"anchor",target:"#about"};
console.log("repro1 accepted?", siteContentSchema.safeParse(r1c).success); // false
console.log("repro2 accepted?", siteContentSchema.safeParse(r2c).success); // false
console.log("valid accepted?", siteContentSchema.safeParse(base()).success); // true
'
# Live endpoint + builds: same as §8bis/§8ter (seed, start API, strict-validate + ETag/304,
# web build success with CMS up; mock 200 with hero.primaryCta={channel:"email"} must exit 1).
```

---

## REMEDIATION r3 — response to Codex re-review §7 (blocker R3-P1-01)

Single blocker: regex-prefix URL checks were bypassable (`https:///`, `/\evil.example` origin escape,
`javascript:` anchor-CTA target). Replaced with **parser-based, context-specific validators** in
`packages/content-types/src/index.ts`; CTA is now a **discriminated union**.

**What changed (§7.3 point-by-point):**
1–2. `isValidAbsoluteHttpUrl(v, {httpsOnly})`: parses with `new URL()`; requires http/https per field
   policy, **non-empty hostname** (kills `https:///`), **no credentials**; rejects control chars/whitespace.
3. `isSafeRelativePath(v)`: exactly one leading `/`; rejects `//`, **backslashes** (kills `/\evil.example`),
   control chars; and re-resolves against a base origin — any resolution that changes origin fails.
4. `isValidAnchor(v)`: `#id` format only.
5. Field-specific policies (no shared permissive schema): `ImageRef.src` = URL or relative (never anchor);
   `FooterLink.href` = URL, relative, or anchor; `Seo.canonical` = **absolute URL only** (never
   anchor/relative); social handle = **https-only** parsed URL.
6. `ctaRefSchema` = `z.discriminatedUnion("channel", …)`: `anchor` CTAs **require** `target` restricted to
   anchor/safe-relative; contact-channel CTAs (`zalo|kakao|phone|email|social`) are **strict without a
   `target` key** — providing one fails validation.
7. Defense-in-depth: `buildHref()` social pass-through now requires a **parsed** https URL with hostname
   and no credentials (http no longer passes), mirroring the schema.

**Tests added (§7.4):** negative — Codex's exact three-part repro; `https:///`; `javascript:`/`data:` CTA
targets; `/\evil.example`; protocol-relative `//host`; credential URLs; anchor CTA missing/invalid target;
contact-CTA with target; anchor image src; anchor/relative canonical; http/credential/malformed social in
builder. Positive — https canonical/social, relative image/footer paths, anchor CTA/footer anchors,
existing zalo/kakao/phone/email behavior. New counts: **contact 9 + cms 30 + revalidate 5 = web 44**.

**Acceptance-gate evidence (§7.5):**
1. Codex repro → `safeParse` **false**; rejected paths: `hero.primaryCta.target | footer.links.0.href | seo.canonical`.
2. Context-specific policies implemented + covered (44/44 web tests).
3. Web production build with valid seeded CMS: **exit 0**.
4. Web production build against a 200 response containing the malformed URL/CTA content: **exit 1** —
   `fail-closed): hero.secondaryCta.target: anchor target must be an in-page anchor (#id) or a safe site-relative path; footer.links.0…`.
5. Live `/public/content`: strict-schema **valid: true**, `ETag "release-1"`, `If-None-Match` → **304** (unchanged).
6. Lint 4/4 clean · content-types/api/admin builds OK · web typecheck via build OK · web tests **44/44** ·
   api tests **19/19** with Mongo (16 + 3 seed-integrity; 3 skipped without Mongo).
7. `tasks.md` (T016/T016B) and this handoff updated with r3 evidence + accurate counts.

**Files changed in r3:** `packages/content-types/src/index.ts` (URL validators + CTA union),
`apps/web/lib/contact.ts` (parsed-https social), `apps/web/lib/{cms,contact}.test.ts` (+11 tests),
`specs/001-landing-page/tasks.md`, this handoff.

### §8ter — r3 verification commands for Codex

```bash
cd korean-shopping-proxy && corepack pnpm@9.15.4 install
corepack pnpm@9.15.4 -r lint
corepack pnpm@9.15.4 --filter @vyvy/content-types build && corepack pnpm@9.15.4 --filter api build && corepack pnpm@9.15.4 --filter admin build
corepack pnpm@9.15.4 --filter web test    # 44 pass (contact 9 + cms 30 + revalidate 5)
corepack pnpm@9.15.4 --filter api test    # 16 pass + 3 Mongo-gated skipped
RUN_MONGO_TESTS=1 MONGO_TEST_URI=mongodb://127.0.0.1:27017/vyvy_seedtest corepack pnpm@9.15.4 --filter api test  # 19 pass

# R3 repro must FAIL (run from apps/web so tsx resolves):
cd apps/web && node --import tsx -e '
import { siteContentSchema } from "@vyvy/content-types";
const c = {meta:{releaseNumber:1,publishedAt:new Date().toISOString()},brand:{name:"V",slogan:"S"},
hero:{headline:"H",subheadline:"S",primaryCta:{label:"x",channel:"anchor",target:"javascript:alert(1)"}},
cta:{headline:"C",channels:[{label:"Z",channel:"zalo"},{label:"K",channel:"kakao"}]},
footer:{contactSummary:"s",links:[{label:"evil",href:"/\\evil.example"}],copyright:"c"},
contact:[{type:"zalo",label:"Z",handle:"0900000000",icon:"i",external:true},{type:"kakao",label:"K",handle:"vyvyorder",icon:"i",external:true}],
seo:{title:"t",description:"d",canonical:"https:///"}};
console.log("accepted?", siteContentSchema.safeParse(c).success); // must be false
'
# Live endpoint + builds: same as §8bis (seed --force-reset, start API, strict-validate, ETag/304,
# web build success with CMS up; malformed-content mock build must exit 1).
```

---

## REMEDIATION r2 — responses to Codex re-review (§6 of `phase-02-codex-review.md`)

All r2 findings addressed. Acceptance-gate evidence (§6.7) mapped below; commands in §8bis.

| ID | Finding | Fix | Evidence |
|----|---------|-----|----------|
| **R2-P1-01** | Normal seed resets admin password/enabled; `$set` overwrites admin edits to seeded records | Seed is now **insert-only everywhere**: admin provisioned with `$setOnInsert` (create-if-absent; a normal seed never changes password hash or enabled state — reset/reactivation are explicit workflows); ALL content upserts also use `$setOnInsert`, so admin edits to seed-owned records are never overwritten (invariant chosen + documented in `seed.core.ts`) | 2 new Mongo tests: changed hash + `enabled:false` survive reseed; edited seeded record title survives reseed — **pass** (19/19 with `RUN_MONGO_TESTS=1`) |
| **R2-P1-02** | Schema accepts whitespace-only strings and `javascript:` URLs | `nonEmpty = z.string().trim().min(1)`; per-channel handle schemas (zalo/kakao id format, phone digits-only 6–15, email validated, social **https-only**); footer/canonical/image hrefs restricted to https/http/site-relative/anchor (`safeHref`); `ContactChannel.href` **removed** from the public shape (web always derives via builder); builder defense-in-depth: social pass-through only for http(s), else `#` | Codex's exact repro (javascript: social + footer link) now **fails** `safeParse`; negative tests for whitespace, `javascript:`, `data:`, bad email/phone; build-level: unsafe-scheme 200 → `next build` **exit 1** with `footer.links.0.href: href must be https/http, a site-relative path, or an in-page anchor` |
| **R2-P2-01** | Nested schemas silently strip unknown fields | **Every** public object schema is now `.strict()` (image, CTA ref, footer link, review, contact, SEO, sections, meta) | Tests prove `hero.publishState`, `contact[].approved`, `services[].seedKey`, `faq[].version` **fail** validation (web + api contract tests); live seeded `/public/content` passes the strict schema (`STRICT schema valid: true`) |
| **R2-P2-02** | CORS validation accepts `ftp://`, `","`, credentials/query/fragment | `parseCorsOrigins()`: requires ≥1 parsed origin; http/https only; rejects wildcards, credentials, path, query, fragment; reused by `main.ts`; added `SameSite=none → Secure=true` dependency check | New `apps/api/test/env.validation.test.ts` (14 tests): valid local/prod; invalid empty/`","`/wildcard/`ftp://`/credentials/path/query/fragment; SameSite/Secure dependency; production default-secret refusals — **pass** |
| **§6.6** | Stale test counts | Counts corrected in `tasks.md` (T015/T016/T016B) and this handoff | Current: contact **8**, cms **20**, revalidate **5** → web **33/33**; api **19/19** (16 unit + 3 Mongo) |

**Files changed in r2:** `packages/content-types/src/index.ts` (trim + strict + per-channel handles + safeHref + no public `href`),
`apps/web/lib/contact.ts` (+https-only social pass-through), `apps/web/lib/{contact,cms}.test.ts` (+negative tests),
`apps/api/src/seed/seed.core.ts` (insert-only `$setOnInsert` everywhere), `apps/api/src/config/env.validation.ts`
(`parseCorsOrigins`, SameSite dependency), `apps/api/src/main.ts` (uses `parseCorsOrigins`),
`apps/api/test/{seed.idempotency,env.validation,assemble.contract}.test.ts`, `specs/001-landing-page/tasks.md`.

**Post-r2 results:** lint 4/4 clean · builds content-types/api/admin/web OK · web tests **33/33** ·
api tests **19/19** (incl. 3 Mongo seed tests) · live seeded `/public/content` valid against the **strict**
schema (`ETag "release-1"`) · web build succeeds with CMS up · fail-closed verified for CMS-down, 404,
partial 200, **and unsafe-scheme 200**.

### §8bis — r2 verification commands for Codex

```bash
cd korean-shopping-proxy
corepack pnpm@9.15.4 install
corepack pnpm@9.15.4 -r lint
corepack pnpm@9.15.4 --filter @vyvy/content-types build && corepack pnpm@9.15.4 --filter api build && corepack pnpm@9.15.4 --filter admin build
corepack pnpm@9.15.4 --filter web test    # 33 pass (contact 8 + cms 20 + revalidate 5)
corepack pnpm@9.15.4 --filter api test    # 16 pass + 3 skipped (Mongo-gated)

# R2-P1-01 (needs Mongo — Codex sandbox denies localhost Mongo; run where reachable):
RUN_MONGO_TESTS=1 MONGO_TEST_URI=mongodb://127.0.0.1:27017/vyvy_seedtest \
  corepack pnpm@9.15.4 --filter api test  # 19 pass, incl. "never resets admin security state" + "admin edits ... survive"

# R2-P1-02 quick check (Codex's original repro must now FAIL):
node --import tsx -e '
import { siteContentSchema } from "@vyvy/content-types";
const r = siteContentSchema.safeParse({});
console.log("empty object valid?", r.success); // false
' # plus: web tests cover javascript:/data:/whitespace cases

# Live endpoint (needs Mongo): seed --force-reset, start API, then strict-validate:
corepack pnpm@9.15.4 --filter api seed --force-reset
node apps/api/dist/main.js &
curl -s http://127.0.0.1:4000/public/content | node --import tsx -e '
import { siteContentSchema } from "@vyvy/content-types";
let s=""; process.stdin.on("data",d=>s+=d).on("end",()=>console.log("STRICT valid:", siteContentSchema.safeParse(JSON.parse(s)).success));'
```

---

## REMEDIATION r1 — responses to Codex review (`phase-02-codex-review.md`)

All 3 blocking + 5 non-blocking findings addressed. Evidence below; commands in §8.

| ID | Finding | Fix | Evidence |
|----|---------|-----|----------|
| **P1-01** | Seed deletes all CMS content | Seed is now **non-destructive**: upserts seed-owned records by stable `seedKey`; admin content (no seedKey) untouched; release/pointer created only when nothing is published; `--force-reset` (dev-only, refused in prod). | `apps/api/test/seed.idempotency.test.ts` (mongo-gated) — admin record survives reseed, no duplicate seed records, release preserved: **pass** |
| **P1-02** | Web validator accepts partial/malformed | Full runtime **Zod schema** (`@vyvy/content-types`) validates the entire response (nested required fields, non-empty strings, Zalo+Kakao contacts, CTA refs, image src/alt, optional sections, meta/publishedAt); `CMS_FETCH_TIMEOUT_MS` validated finite/positive/bounded. | `apps/web/lib/cms.test.ts` (13 tests) + build-level: partial 200 → build **exit 1** with field errors |
| **P1-03** | Seed strips required `order`; contract mismatch | Blanket `strip()` replaced by per-entity `assembleReleaseContent()`: `order` **preserved** for processSteps/faq; dropped where public type omits it; admin fields never exposed. | `apps/api/test/assemble.contract.test.ts` validates assembled content against the shared schema; live `/public/content` **schema valid: true**, `processSteps[0].order=1`, `faq[0].order=1` |
| **P2-01** | Revalidate secret via query string | Header-only (`x-revalidate-secret`); query fallback removed; constant-time compare (`lib/revalidate-auth.ts`). | `apps/web/lib/revalidate.test.ts` (5 tests: missing/incorrect/correct/no-secret/no-query) |
| **P2-02** | Incomplete env validation | Expanded `env.validation.ts`: session TTL, cookie secure/SameSite, media size/MIME, `STORAGE_DRIVER` enum, URL checks, CORS origin semantics; **production guard** rejects default `SESSION_SECRET`/admin password and non-secure cookies. | boots + validates; production guard unit-checkable |
| **P2-03** | Public review exposes `approved` | Public `CustomerReview` type has **no** `approved`; assembler filters to approved-only and omits the flag. | contract test asserts no `approved` in public reviews |
| **P2-04** | Versioning docs inconsistent | Explicitly **deferred**: v1 = current unversioned paths (`/public/content`); path-versioning on first breaking change. Updated `contracts/content-model.md` + `contracts/admin-api.md`. | docs consistent with controller + web client |
| **P3-01** | Meaningless snapshot test | Removed; snapshot absence covered by architecture + fail-closed tests. | `contact.test.ts` now 7 behavioral tests |

**New/changed since original Phase 2:** `packages/content-types/src/index.ts` (Zod source-of-truth,
public review without `approved`, `parseSiteContent`/`safeParseSiteContent`), `apps/api/src/seed/{seed.core.ts,assemble.ts,seed.ts,seed.data.ts}`,
`apps/api/src/common/base-fields.ts` (+`seedKey`), `apps/api/src/content/schemas.ts` (+`seedKey`),
`apps/api/src/config/env.validation.ts` (expanded), `apps/api/test/{assemble.contract.test.ts,seed.idempotency.test.ts}`,
`apps/web/lib/{cms.ts,cms.test.ts,revalidate-auth.ts,revalidate.test.ts}`,
`apps/web/app/api/revalidate/route.ts`, `apps/web/lib/contact.test.ts`,
`specs/001-landing-page/contracts/{content-model.md,admin-api.md}`, `tasks.md`.
Added deps: `zod` (content-types), `tsx` (api tests).

**Post-remediation results:** `pnpm -r lint` 4/4 clean · builds content-types/api/admin/web OK ·
web tests **26/26** · api tests **5/5** (incl. mongo idempotency with `RUN_MONGO_TESTS=1`) ·
fail-closed verified for CMS-down, 404, and **partial 200**.

Ground rules: code only inside `korean-shopping-proxy/`; no production deploy; not committed;
all URLs/domains/CORS/canonical/media-origin are env-driven (production domain not finalized).
Toolchain: Node 20.20.1 · pnpm 9.15.4 (corepack) · MongoDB local `127.0.0.1:27017` (Docker daemon off → local `mongod`).

---

## 1. Completed tasks

| Task | Summary |
|------|---------|
| T007 | `@nestjs/config` boot-time env validation (fail-closed) + Mongoose connection (`src/config/`) |
| T008 | `main.ts`: CORS from `CORS_ORIGINS` (credentials), global `ValidationPipe` (whitelist+transform), standardized exception filter (envelope + `409 CONFLICT`) |
| T009 | Full shared types `packages/content-types/src/index.ts` (SiteContent + all section interfaces) |
| T010 | Common `base-fields` (publishState/order/version + timestamps), release primitives (PageRelease/SiteState), `ReleasesService` (current-release query), error envelope/409 |
| T011/T012/T013 | Mongoose schemas + modules for 9 sections + media + AdminUser |
| T013B | Per-section visibility (`sectionVisibility` on release, `sectionVisibilityDraft` on state); required sections not disable-able; reviews disabled by default |
| T014 | `GET /public/content` → current release as `SiteContent` + `ETag` + `304`; enabled+published only |
| T015 | Idempotent seed (non-production VI content) + bcrypt admin; reviews unapproved → honest empty state |
| T016 | `web/lib/cms.ts` fail-closed fetch (bounded timeout, reject malformed; throws → build fails); no snapshot |
| T016B | `web/lib/contact.ts` builder + `contact.test.ts` (8 tests pass) |
| T017 | ISR `revalidate=300` + secret-guarded `app/api/revalidate/route.ts` + `generateMetadata` (SEO from CMS, fail-closed) |
| T018 | Brand palette tokens (soft pink/beige/Korea red/warm white) in `globals.css` |

`tasks.md` updated: T007–T018 marked `[x]` with verification notes.

## 2. Unfinished tasks (deferred by design or to later phases)

- Per-section **admin DTOs + runtime validation** → US2 (T025a–T027a) where controllers use them.
- **CMS-driven rendering** of each section → US1/US3/US4 (page currently renders existing static
  components; only SEO metadata is CMS-driven so far).
- **Auth / admin CRUD / publish / rollback / media endpoints / audit** → US2 (T024–T034E).
- Everything Phase 3+ (US1 T019–T023 onward) — not started.

## 3. Files created / modified / moved / deleted

**Created (API):** `apps/api/src/main.ts`, `app.module.ts`,
`config/env.validation.ts`, `config/config.module.ts`,
`common/base-fields.ts`, `common/http-exception.filter.ts`,
`content/schemas.ts`, `content/content.module.ts`,
`media/media.schema.ts`, `media/media.module.ts`,
`users/users.schema.ts`, `users/users.module.ts`,
`releases/release.schemas.ts`, `releases/releases.service.ts`, `releases/releases.module.ts`,
`public/public.controller.ts`, `public/public.module.ts`,
`seed/seed.ts`, `seed/seed.data.ts`.
**Created (web):** `apps/web/lib/cms.ts`, `apps/web/lib/contact.ts`, `apps/web/lib/contact.test.ts`,
`apps/web/app/api/revalidate/route.ts`.
**Created (content-types):** `packages/content-types/src/index.ts` (full types; replaced skeleton).
**Modified:** `apps/api/package.json` (+@nestjs/mongoose, mongoose, class-validator, class-transformer,
bcryptjs, @types/bcryptjs; `seed` script), `apps/web/app/page.tsx` (generateMetadata + `revalidate`),
`apps/web/app/globals.css` (brand tokens), `apps/web/package.json` (content-types dep, tsx, `test` script).
**Moved / deleted:** none this phase (relocation happened in Phase 1). Untracked local `.env` files
created for verification (gitignored).

## 4. Technical decisions

1. **Per-section admin DTOs/validation deferred to US2** — Phase 2 ships schemas + modules only; DTOs
   live with the controllers that use them (T025a–T027a). Avoids duplicating T011–13 and T025a work.
2. **Next 16 `revalidateTag` signature changed** (now requires a cache profile) → revalidation route
   uses `revalidatePath('/', 'page')` for the single-page site; `CONTENT_TAG` retained on the fetch
   for future tag-scoped invalidation.
3. **Serving model = PageRelease** (denormalized published content), not per-section collections —
   gives atomic, draft-free serving. `PageRelease.content` IS the release's content, not a snapshot.
4. **No durable snapshot** (per the dropped-snapshot decision): fail-closed build + Next ISR defaults.
5. **Fail-closed vs. warm cache**: on a fresh build the CMS-down build fails; a warm `.next/cache` can
   reuse a prior 200 (Next Data Cache). Deploy builds must be clean — to be enforced in ops T055.

## 5. Lint / typecheck / build / test results

```
pnpm -r lint          → 4/4 projects Done, 0 error / 0 warning
content-types build   → OK (tsc → dist; also serves as typecheck)
api build (nest)      → OK
admin build (next, typecheck ON) → OK
web build (next, typecheck ON, CMS up) → OK  (route / = ○ Static, Revalidate 5m; /api/revalidate = ƒ)
web test (contact)    → 8 tests / 8 pass / 0 fail
```

## 6. Integration / end-to-end results

**Seed (MongoDB):**
```
release #1 (id 6a59cd02db9cede2fb0ae715)
services=3 trustPoints=3 processSteps=6 categories=4 faq=2 contacts=3
reviews inserted=2 approved(public)=0 (reviews section disabled by default)
admin username="admin"
```

**`GET /public/content`:** `200`; `ETag: "release-1"`; `meta.releaseNumber=1`; top-level keys exclude
`reviews` (disabled section omitted); `If-None-Match "release-1"` → `304`. Draft/unapproved excluded
(release holds only published content; unapproved reviews filtered → approved(public)=0).

**Web build (CMS up):** success; `/` static + ISR 5m.

**Fail-closed (FR-030):**
- CMS 404/invalid → `next build` exit 1: `"CMS responded 404 (fail-closed: refusing to render an empty page)."`
- CMS down + clean `.next` → exit 1: `"Failed to reach CMS ... (fail-closed). Cause: fetch failed"`.

**Contact builder:** 8/8 (zalo→https zalo.me, kakao→https pf.kakao.com, phone→tel:, email→mailto:,
social→as-is, empty handle→`#`, external→target/rel).

## 7. Blockers / risks / technical debt

- **No blocking issues.**
- **Risk — fail-closed + warm cache:** deploy builds must be clean (no reused `.next/cache`); enforce
  in T055. Verified fail-closed on clean builds.
- **Tech debt:** admin DTO/validation & per-section services not yet present (US2); `page.tsx` still
  renders static components (US1 rewrites to CMS-driven); `contact.ts` builder wired but not yet
  consumed by components (US1). Seed content is non-production placeholder (launch gate FR-045).
- **Env:** requires MongoDB at `127.0.0.1:27017` (or set `MONGO_URI`).

## 8. Commands for Codex to re-run (verify)

Run from `korean-shopping-proxy/`. Ensure MongoDB is reachable.

```bash
cd korean-shopping-proxy
corepack pnpm@9.15.4 install

# Lint + builds
corepack pnpm@9.15.4 -r lint                       # 4/4 clean
corepack pnpm@9.15.4 --filter @vyvy/content-types build
corepack pnpm@9.15.4 --filter api build
corepack pnpm@9.15.4 --filter admin build

# Unit tests (no Mongo needed) — validator, contact, revalidate, contract, timeout
corepack pnpm@9.15.4 --filter web test             # expect 26 pass (contact 7 + cms 13 + revalidate 5 + 1)
corepack pnpm@9.15.4 --filter api test             # expect 4 pass + 1 skipped (mongo-gated)

# P1-01 seed idempotency (needs Mongo; Codex sandbox denies localhost Mongo → run where reachable)
RUN_MONGO_TESTS=1 MONGO_TEST_URI=mongodb://127.0.0.1:27017/vyvy_seedtest \
  corepack pnpm@9.15.4 --filter api test           # expect 5 pass (admin data survives, no dup seed, release preserved)

# Seed + public endpoint contract (P1-03)
cp apps/api/.env.example apps/api/.env             # MONGO_URI=mongodb://127.0.0.1:27017/vyvy
corepack pnpm@9.15.4 --filter api build
corepack pnpm@9.15.4 --filter api seed --force-reset  # rebuild with corrected assembler; "release #1 (created)"
node apps/api/dist/main.js &                       # :4000
curl -i http://127.0.0.1:4000/public/content       # 200 + ETag "release-1"; no "reviews" key
# validate against the shared schema + confirm order preserved:
node --import tsx -e 'import {siteContentSchema} from "@vyvy/content-types";import fs from "node:fs";const c=JSON.parse(fs.readFileSync(0));console.log("valid:",siteContentSchema.safeParse(c).success,"order:",c.processSteps?.[0]?.order,c.faq?.[0]?.order)' < <(curl -s http://127.0.0.1:4000/public/content)

# Web build with CMS up (expect success; / static, Revalidate 5m)
cp apps/web/.env.example apps/web/.env              # CMS_PUBLIC_URL=http://127.0.0.1:4000
corepack pnpm@9.15.4 --filter web build

# Fail-closed — all THREE must fail the build (exit 1):
CMS_PUBLIC_URL="http://127.0.0.1:4000/wrong-base" corepack pnpm@9.15.4 --filter web exec next build   # 404
kill %1 ; rm -rf apps/web/.next && corepack pnpm@9.15.4 --filter web exec next build                  # CMS down (clean)
# partial 200 (P1-02): point a mock returning {meta:{releaseNumber:1},brand:{},...} at CMS_PUBLIC_URL → build fails with field errors
```

Note: P2-01 revalidation is now header-only (`x-revalidate-secret`); a `?secret=` query no longer authorizes.

---

_Stop point: Phase 2 remediation **r4** complete; awaiting Codex re-review. Do not start Phase 3 (US1, T019–T023) until approved._
