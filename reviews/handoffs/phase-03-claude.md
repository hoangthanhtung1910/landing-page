# Phase 03 Handoff — User Story 1 (Visitor decides to make contact)

**Phase:** 3 (US1, tasks T019–T023)
**Completed:** 2026-07-21 · **Remediation r1:** 2026-07-22 (3× P2) · **r2:** 2026-07-22 (residual P2 + doc sync) · **r3:** 2026-07-22 (missing-site-URL P2 + doc sync)
**Author:** Claude (handoff claim — Codex verifies independently)
**Prev checkpoint:** Phase 2 (`phase-02-claude.md`, approved by Codex `phase-02-codex-review.md` §10)

Ground rules: code only inside `korean-shopping-proxy/`; no production deploy; not committed; all
URLs/origins env-driven (production domain not finalized). This checkpoint is a **technical demo**, not
the shippable CMS MVP — do not ship before the launch gate (T057).
Toolchain: Node 20.20.1 · pnpm 9.15.4 (corepack) · MongoDB local `127.0.0.1:27017`.

---

## REMEDIATION r3 — response to Codex r2 re-review (missing-site-URL P2 + 3 stale numbers)

Codex confirmed r2's invalid-URL handling but noted the **missing** (unset/empty) case still slipped
through: `resolveMetadataBase` returned `undefined`, leaving Next with no `metadataBase`, so a
site-relative OG image would still resolve to the wrong (localhost) domain. Also flagged three stale
handoff numbers.

| ID | Finding | Fix | Evidence |
|----|---------|-----|----------|
| **P2-02c** | Unset/empty `NEXT_PUBLIC_SITE_URL` → `metadataBase` undefined → relative OG image resolves to the wrong domain (`metadata.ts:7-12`). | `NEXT_PUBLIC_SITE_URL` is now **required**: unset/empty **throws** (mirrors `cms.ts`'s `required("CMS_PUBLIC_URL")`). `resolveMetadataBase` returns `URL` (never `undefined`); a base is always present so every relative metadata URL resolves to the site origin. | Live web build with an **empty** site URL → **exit 1** (`Missing NEXT_PUBLIC_SITE_URL (fail-closed …)`); valid URL → **exit 0**. Unit test updated: unset/empty now asserts `throws`. |
| **DOC-3** | §5 still said web tests **59/59**. | Corrected to **65/65** (+6 metadata). | §5 updated. |
| **DOC-4** | §8 re-run command comment still said **59** pass. | Corrected to **65** and added the empty-URL fail-closed build step. | §8 updated. |
| **DOC-5** | §3 file list omitted `lib/metadata.ts` and `lib/metadata.test.ts`. | Added (plus the r1/r2 file annotations). | §3 updated. |

**Files changed in r3:** `apps/web/lib/metadata.ts` (required/fail-closed on unset),
`apps/web/lib/metadata.test.ts` (unset/empty → throws; still 6 tests), this handoff (§3/§5/§8, r2 note, header).

**Post-r3 results:** lint 4/4 · web typecheck pass · web tests **65/65** · content-types/api/admin builds
pass · live web build **exit 0** (valid site URL) and **exit 1** (empty site URL, fail-closed) ·
`git diff --check` clean · isolated `vyvy_p3r3` DB dropped and temp processes stopped.

---

## REMEDIATION r2 — response to Codex r1 re-review (1 residual P2 + 2 stale docs)

Codex confirmed both r1 UI fixes (secondary `#quy-trinh` hidden; `--cta` stays Korea-red in light/dark)
and flagged a residual on the OG-image fix plus two out-of-date handoff descriptions.

| ID | Finding | Fix | Evidence |
|----|---------|-----|----------|
| **P2-02b** | An **invalid** `NEXT_PUBLIC_SITE_URL` was silently swallowed (`try/catch → undefined`), still emitting wrong-domain metadata (`page.tsx:21-29`). | Extracted `resolveMetadataBase()` (`apps/web/lib/metadata.ts`): a declared-but-**invalid** value (unparseable, non-http(s), or hostname-less) **throws** — fail-closed, mirroring `next.config`'s MEDIA_ORIGIN. `generateMetadata` calls it directly (no silent fallback). **(r3 tightened the unset/empty case from `undefined` to also throw — see P2-02c.)** | Live build with `NEXT_PUBLIC_SITE_URL="not-a-url"` → **exit 1** (`Invalid NEXT_PUBLIC_SITE_URL="not-a-url" … Fail-closed`); valid URL → **exit 0**. |
| **DOC-1** | Handoff §1 T019 row still said `bg-accent`/`text-accent-foreground`. | Corrected to `bg-cta`/`text-cta-foreground` (mode-stable). | §1 table updated. |
| **DOC-2** | Handoff §6 mobile E2E still said the secondary "Xem quy trình" appears, contradicting r1. | Corrected to state it is **hidden** by the r1 `availableAnchors` gating. | §6 updated. |

**Tests (r2):** added `apps/web/lib/metadata.test.ts` (**6** tests: valid URL, trims whitespace,
invalid→throws, non-http(s)→throws, hostname-less→throws, and — as tightened in r3 — unset/empty→throws)
and wired it into the web `test` script. Web tests now **65/65**.

**Files changed in r2:** `apps/web/lib/metadata.ts` (new), `apps/web/lib/metadata.test.ts` (new),
`apps/web/app/page.tsx` (use `resolveMetadataBase`, drop silent try/catch), `apps/web/package.json`
(test script), this handoff (§1, §6, header).

**Post-r2 results:** lint 4/4 · web typecheck pass · web tests **65/65** · content-types/api/admin builds
pass · live web build **exit 0** with a valid site URL and **exit 1** (fail-closed) with an invalid one ·
isolated `vyvy_p3r2` DB dropped and temp processes stopped.

---

## REMEDIATION r1 — response to Codex Phase-3 review (3× P2)

All three non-blocking P2 findings fixed and independently verified against a live isolated CMS.

| ID | Finding | Fix | Evidence |
|----|---------|-----|----------|
| **P2-01** | Hero secondary CTA points to a section that doesn't exist yet (`#quy-trinh`), a dead link in US1 (`hero.tsx:66-77`). | `Hero` now takes `availableAnchors` — the in-page anchor ids the shell actually renders. A secondary **anchor** CTA whose `#target` is not present is **hidden** (site-relative and contact CTAs always show). `page.tsx` passes `["#lien-he"]` for US1; US3/US4 extend it as they add sections. | Rendered `/` HTML: `#quy-trinh` count **0**, "Xem quy trình" count **0**; only the primary Zalo CTA renders. read_page shows no secondary CTA. |
| **P2-02** | Relative OG image resolves against the wrong domain (`page.tsx:21-25`). | `generateMetadata` now sets `metadataBase` from `NEXT_PUBLIC_SITE_URL`. Relative metadata URLs resolve against the **site** origin; absolute CMS/CDN media URLs are unaffected. **(Superseded by r2/P2-02b — the guard was made fail-closed instead of silently swallowing an invalid value.)** | Build against a mock CMS with `seo.ogImage.src="/brand/og-cover.png"` → `<meta property="og:image" content="https://vyvyorder.example.com/brand/og-cover.png">` (site domain, not the CMS/media origin). |
| **P2-03** | Primary CTA loses the Korea-red color in dark mode (`hero.tsx:56-59`) — dark theme repurposes `--accent` as a muted surface. | Added a dedicated, mode-stable **`--cta` / `--cta-foreground`** token pair (Korea red in both light and dark) in `globals.css` + `@theme inline`; hero primary CTA uses `bg-cta text-cta-foreground` instead of `bg-accent`. | Dark-mode screenshot: primary "Liên hệ qua Zalo" renders bright Korea-red on the dark background. |

**Files changed in r1:** `apps/web/components/hero.tsx` (availableAnchors gating + `bg-cta`),
`apps/web/app/page.tsx` (`metadataBase` + passes `availableAnchors`), `apps/web/app/globals.css`
(`--cta`/`--cta-foreground` in light `:root`, `.dark`, and `@theme inline`), this handoff.

**Post-r1 results:** lint 4/4 · web typecheck pass · web tests **59/59** ·
content-types/api/admin/web builds pass · `git diff --check` clean · live build+render verified for all
three fixes; isolated `vyvy_p3fix` DB dropped and temp processes stopped.

> **Note on the design token (P2-03):** the fix touches `globals.css` (owned by T018/Phase 1) because
> the dark theme's `--accent` redefinition made FR-004's "Korea-red CTA" unachievable via that token.
> The new `--cta` pair is additive and does not change any existing `accent` usage.

---

## 1. Completed tasks

| Task | Summary |
|------|---------|
| **T019** | `apps/web/components/hero.tsx` rebuilt as a props-driven server component rendering `content.hero` + `content.brand`: single `<h1>` from `hero.headline`, brand slogan + `hero.subheadline`, optional brand `tagline` pill, above-the-fold **primary contact CTA in the Korea-red CTA token** (`bg-cta`/`text-cta-foreground`, mode-stable per r1, FR-004), optional secondary CTA (gated on `availableAnchors` per r1), optional `hero.media`. CTA destinations resolved from the referenced contact channel. |
| **T020** | `apps/web/components/cta-section.tsx` rebuilt to render `content.cta` (headline + optional subtext) with a button per `cta.channels` entry, each href built from the referenced contact channel via `contact.ts`. Zalo + Kakao are guaranteed present by validation (FR-010). Section carries the `#lien-he` anchor id. |
| **T021** | New `apps/web/components/contact-bar.tsx`: `fixed inset-x-0 bottom-0 z-50 md:hidden` sticky mobile bar with Zalo + Kakao from `content.contact`, `h-14` tap targets (≥44px, FR-012). Renders zalo→kakao in a fixed order regardless of array order; hidden on desktop where the sticky header carries the contact action. |
| **T022** | `site-header.tsx` and `site-footer.tsx` rebuilt as props-driven components rendering brand/contact from CMS content (FR-013). Header is now a **server component** (brand name + `ThemeToggle` + a Zalo contact button); footer renders brand, `footer.contactSummary`, all `content.contact` channels, `footer.links`, and `footer.copyright`. |
| **T023** | `apps/web/app/page.tsx` composed as an async server component: fetches content once via `getSiteContent()` (Next dedupes the fetch shared with `generateMetadata`), renders the required sections (Hero §1, Contact CTA §7, Footer §8) + `ContactBar`, with **ordered FR-015 slot comments** for optional sections §2–§6 + FAQ (inserted later by T036/T041), and keeps `generateMetadata()` mapping SEO content (FR-014). Mobile bottom padding so the fixed ContactBar never covers the footer. |

**Supporting work (shared, reused by the above):**
- `apps/web/lib/contact.ts`: added `resolveCta(ref, contacts)` → `{ href, external, channel? }` turning a
  `CtaRef` into a clickable destination (anchor → `target`; contact channel → `buildHref`). **+4 unit tests.**
- `apps/web/components/channel-icon.tsx`: fixed per-`type` lucide icon map for contact channels
  (zalo→MessageCircle, kakao→MessageSquare, phone→Phone, email→Mail, social→Globe) — reliable SSR, no
  dynamic icon-name resolution.

## 2. Unfinished tasks (out of scope for US1, by design)

- Optional-section components (`trust-bar`, `categories`, `how-it-works`, `features`, `testimonials`,
  `faq`) are **still the pre-US1 template** and are **not imported** by `page.tsx`. They are adapted to
  CMS content and inserted at the FR-015 slots in **US3 (T036)** and **US4 (T041)**.
- The header intentionally carries **no optional-section nav links** yet — US1 has no in-page sections to
  link to; those links are added with their sections in US3/US4.

## 3. Files created / modified / deleted

- **Created:** `apps/web/components/contact-bar.tsx`, `apps/web/components/channel-icon.tsx`,
  `apps/web/lib/metadata.ts` (r2, `resolveMetadataBase`), `apps/web/lib/metadata.test.ts` (r2/r3, 6 tests).
- **Modified:** `apps/web/components/hero.tsx` (r1: `availableAnchors` gating + `bg-cta`),
  `apps/web/components/cta-section.tsx`, `apps/web/components/site-header.tsx`,
  `apps/web/components/site-footer.tsx`, `apps/web/app/page.tsx` (r1 `metadataBase` +
  `availableAnchors`; r2/r3 fail-closed `resolveMetadataBase`), `apps/web/app/globals.css`
  (r1 `--cta`/`--cta-foreground`), `apps/web/lib/contact.ts` (+`resolveCta`),
  `apps/web/lib/contact.test.ts` (+4 tests), `apps/web/package.json` (r2 test script + `metadata.test.ts`),
  `specs/001-landing-page/tasks.md`, this handoff.
- **Deleted:** none. (Unused template section components are left in place for US3/US4 adaptation.)

## 4. Technical decisions

- **Content flows top-down as props.** `page.tsx` fetches once and passes typed slices to each section;
  components are pure/testable and do no fetching. `generateMetadata` and the page share one deduped
  fetch (Next fetch cache) — no `React.cache` wrapper needed.
- **CTA resolution centralized** in `resolveCta` so hero/cta-section/header/footer all turn refs/channels
  into links the same way, honoring INV-10 (unique type → deterministic lookup) and R4-P1-01 (every
  non-anchor ref is configured). The unresolved branch returns `#` defensively but cannot fire on
  validated content.
- **Contact links are `<a>` with `buttonVariants`**, not the base-ui `Button` (which renders `<button>`).
- **Channel icons are a fixed per-type map**, not the CMS `icon` string — the type set is small/closed,
  so this avoids runtime icon-name resolution and guarantees a real glyph under SSR.
- **Header is a server component** (dropped the client mobile-menu since there are no section links in
  US1); `ThemeToggle` remains the only client island.
- **Placeholder media** (`hero.media`, logos) point at non-existent seed files (FR-045) → they render as
  empty/broken boxes in the demo. Expected; real media arrives at the launch gate. The build does **not**
  fail on this (next/image optimizes lazily at request time).

## 5. Lint / typecheck / build / test results

- `pnpm -r lint` — **4/4 projects pass.**
- `pnpm --filter web typecheck` — **pass** (exit 0).
- Builds: `@vyvy/content-types`, `api`, `admin` — **all pass**; `web` production build against a live CMS
  — **pass** (`/` static, Revalidate 5m).
- Web tests — **65/65 pass** (contact 13 incl. 4 `resolveCta` + cms 41 + revalidate 5 + metadata 6).
- API tests — **16/16** without Mongo (3 gated skipped) / **19/19** with Mongo (unchanged by this phase).

## 6. Integration / end-to-end results

Verified against a live isolated CMS (`vyvy_p3review` DB, API on :4100, web prod server on :3100):

- `GET /public/content` → `200`, `ETag "release-1"`, strict-valid, unique contact types.
- Web production build against the live CMS → **exit 0**.
- Rendered `/` HTML: **exactly one `<h1>`**; brand name, hero headline, slogan, CTA headline, copyright,
  and `/privacy` link all present; `https://zalo.me/0900000000` and `https://pf.kakao.com/vyvyorder`
  links resolved.
- **Mobile (375px)**: brand header with Zalo action; hero headline + slogan + subheadline; Korea-red
  primary CTA "Liên hệ qua Zalo" above the fold; the seed secondary CTA ("Xem quy trình" → `#quy-trinh`)
  is **hidden** because that section is not in the US1 shell (r1 `availableAnchors` gating); sticky
  bottom bar with Zalo + KakaoTalk visible at first paint.
- **Desktop**: two-column hero; sticky header with Zalo action; **sticky bottom bar correctly hidden**
  (`md:hidden`); CTA section (Zalo + Kakao) and footer (brand, contact channels, links, copyright) render.
- Temporary API/web processes stopped; the isolated `vyvy_p3review` database was dropped.

## 7. Blockers / risks / technical debt

- **Placeholder media** renders broken until real assets land (FR-045 launch gate) — cosmetic only.
- Optional-section components still carry template copy; they must be CMS-adapted before appearing on the
  page (tracked as US3/US4). They are not shipped now because they are not imported.
- No component-level render tests yet (US1 sections are pure functions of props); behavior is covered by
  the `resolveCta`/`buildHref` unit tests plus the live end-to-end HTML assertions above. Richer
  component tests can follow if desired.

## 8. Commands for Codex to re-run (verify)

```bash
cd korean-shopping-proxy && corepack pnpm@9.15.4 install
corepack pnpm@9.15.4 -r lint
corepack pnpm@9.15.4 --filter web typecheck
corepack pnpm@9.15.4 --filter @vyvy/content-types build && corepack pnpm@9.15.4 --filter api build && corepack pnpm@9.15.4 --filter admin build
corepack pnpm@9.15.4 --filter web test      # 65 pass (contact 13 + cms 41 + revalidate 5 + metadata 6)

# Live end-to-end (needs Mongo): seed an isolated DB, start API, build + serve web, assert render.
MONGO_URI=mongodb://127.0.0.1:27017/vyvy_p3verify PORT=4100 corepack pnpm@9.15.4 --filter api seed --force-reset
MONGO_URI=mongodb://127.0.0.1:27017/vyvy_p3verify PORT=4100 corepack pnpm@9.15.4 --filter api start &
CMS_PUBLIC_URL=http://127.0.0.1:4100 MEDIA_ORIGIN=http://127.0.0.1:4100/media \
  NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000 corepack pnpm@9.15.4 --filter web build   # exit 0
# r3 fail-closed: an EMPTY site URL breaks the build (dotenv won't override an already-set empty key):
NEXT_PUBLIC_SITE_URL="" CMS_PUBLIC_URL=http://127.0.0.1:4100 MEDIA_ORIGIN=http://127.0.0.1:4100/media \
  corepack pnpm@9.15.4 --filter web build   # exit 1: "Missing NEXT_PUBLIC_SITE_URL (fail-closed …)"
CMS_PUBLIC_URL=http://127.0.0.1:4100 MEDIA_ORIGIN=http://127.0.0.1:4100/media \
  NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000 PORT=3100 corepack pnpm@9.15.4 --filter web start &
curl -s http://127.0.0.1:3100/ | grep -c '<h1'          # exactly 1
curl -s http://127.0.0.1:3100/ | grep -o 'https://zalo.me/[0-9]*'      # zalo link present
# then drop the isolated DB and stop the processes.
```

**Gate:** US1 technical-demo checkpoint reached — the landing page renders required sections from live
CMS content with working Zalo/Kakao contact actions reachable from every scroll position. **Phase 4 not
started; stopping for independent Codex review.**
