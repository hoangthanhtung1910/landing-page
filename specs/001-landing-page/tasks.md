---

description: "Task list for VyVy Order Korea landing page implementation"
---

# Tasks: VyVy Order Korea Landing Page

**Input**: Design documents from `/specs/001-landing-page/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: No automated tests are requested in the spec (marketing landing page). Validation is manual/visual per `quickstart.md`. No test tasks are generated.

**Organization**: Tasks are grouped by user story (US1 P1, US2 P2, US3 P3) so each can be implemented and validated independently.

**Working directory**: All application code lives in `korean-shopping-proxy/` (project rule — do not create app code elsewhere). Paths below are relative to that folder unless noted.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story the task belongs to (US1/US2/US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the existing Next.js scaffold for work.

- [ ] T001 Install dependencies and confirm the app runs in `korean-shopping-proxy/` — run `pnpm install`, then verify `pnpm dev` serves the page and `pnpm build` succeeds (baseline before changes).
- [ ] T002 [P] Delete off-spec components so the page can match the mandated 8 sections: remove `components/pricing.tsx` and `components/faq.tsx` (and `components/trust-bar.tsx` if its content is folded into Why-choose-us during T016).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Content model, contact model, brand theme, layout metadata, and page shell that ALL user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T003 Define TypeScript interfaces for the content model (SiteContent, Brand, Hero, ServiceOffering, TrustPoint, ProcessStep, ProductCategory, CustomerReview, ContactCTA, Footer, ContactChannel, CtaRef, ImageRef, FooterLink) in `lib/types.ts`, matching `specs/001-landing-page/data-model.md`.
- [ ] T004 Create `lib/contact.ts`: channel config (zalo, kakao, phone) with placeholder handles, plus pure `buildHref(channel)` and `isResolvable(channel)` per `contracts/contact-channels.md` (https-only Zalo/Kakao links, `#` + "coming soon" fallback when handle missing).
- [ ] T005 Create `lib/content.ts` exporting a single typed `content: SiteContent` with all Vietnamese copy: brand name "VyVy Order Korea", slogan "Nơi gửi trọn niềm tin, mang cả Hàn Quốc đến tay bạn", ≥3 services, ≥3 trust points, ≥5 ordered process steps (link→quote→pay→purchase→ship→deliver), ≥4 categories (mỹ phẩm, thời trang, đồ điện tử, đồ K-pop), ≥3 attributed reviews, CTA, footer, and the shared contact channels. Uses types from T003 and channels from T004.
- [ ] T006 [P] Add brand palette + base typography theme tokens to `app/globals.css`: main = soft pink, secondary = beige, accent = Korea red, background = warm white, warm-dark foreground; ensure AA text contrast (research Decision 6, FR-019).
- [ ] T007 Rebrand `app/layout.tsx` metadata to VyVy Order Korea: Vietnamese `title` + `description` (Korea–Vietnam shopping keywords), Open Graph/Twitter card fields, `metadataBase`/canonical, keep `lang="vi"`, set `viewport.themeColor` to the Korea-red accent (FR-014).
- [ ] T008 Rebrand `components/site-header.tsx` to VyVy Order Korea (brand name/logo text, Vietnamese nav labels anchoring to section ids, desktop contact CTA using `lib/contact.ts`).
- [ ] T009 Rewrite `app/page.tsx` into the mandated section shell in exact order — Hero → Services → Why choose us → Ordering process → Product categories → Customer reviews → Contact CTA → Footer — with stable section `id`s for anchor links; render `SiteHeader`, `SiteFooter`, and the sticky `ContactBar`, leaving section slots to be filled per story (FR-015, INV-1). Sections not yet implemented render nothing/stub until their story phase.

**Checkpoint**: Content, contact, theme, metadata, and page shell ready — user stories can begin.

---

## Phase 3: User Story 1 - Visitor decides to make contact (Priority: P1) 🎯 MVP

**Goal**: A mobile visitor immediately understands the service, trusts it, and can tap Zalo/Kakao from anywhere on the page.

**Independent Test**: Load on a ~375px viewport — hero shows brand + slogan/value prop + primary contact CTA above the fold (single `<h1>`); a sticky contact bar keeps Zalo/Kakao reachable at any scroll position; tapping resolves to the correct channel with web fallback.

- [ ] T010 [P] [US1] Adapt `components/hero.tsx` (§1) to render from `content.hero`/`content.brand`: the only `<h1>` (headline), slogan/subheadline, above-the-fold primary contact CTA (Korea-red accent) + optional secondary anchor to the process section, using brand palette (FR-004, FR-018, INV-2).
- [ ] T011 [P] [US1] Adapt `components/cta-section.tsx` (§7) to render `content.cta` with Zalo AND Kakao buttons built via `lib/contact.ts` (FR-010, INV-6).
- [ ] T012 [P] [US1] Create `components/contact-bar.tsx`: sticky bottom bar (mobile only, hidden on desktop) with Zalo + Kakao actions from `content.contact`, ≥44px tap targets (FR-012).
- [ ] T013 [US1] Rebrand `components/site-footer.tsx` (§8) to render `content.footer`: brand + slogan, contact summary + channel links, supporting/footer links (privacy/terms placeholders), Vietnamese copyright (FR-013).
- [ ] T014 [US1] Wire the §1, §7, §8 sections and `ContactBar` into `app/page.tsx` slots (from T009); ensure all external contact links use `target="_blank"` + `rel="noopener noreferrer"` (contact-channels R-2).

**Checkpoint**: MVP — page renders with hero, working contact CTAs everywhere, and footer; conversion path is fully functional.

---

## Phase 4: User Story 2 - Visitor understands the ordering process (Priority: P2)

**Goal**: A first-time visitor understands the end-to-end buy-and-ship flow.

**Independent Test**: The Ordering process section shows sequential, numbered steps covering link/request → quote → confirm & pay → purchase in Korea → international shipping → delivery in Vietnam, followed by a contact CTA.

- [ ] T015 [US2] Adapt `components/how-it-works.tsx` into `components/ordering-process.tsx` (§4): render `content.processSteps` as an ordered/numbered sequence with icons, plus a closing contact CTA (from `lib/contact.ts`) inviting the visitor to start an order (FR-007, INV-5).
- [ ] T016 [US2] Insert the §4 Ordering-process section into its slot in `app/page.tsx` (between Why-choose-us and Product categories per FR-015).

**Checkpoint**: US1 + US2 both work independently.

---

## Phase 5: User Story 3 - Visitor builds trust and explores categories (Priority: P3)

**Goal**: Trust content, product categories, and reviews raise confidence and relevance.

**Independent Test**: Why-choose-us shows ≥3 trust points; Product categories shows cosmetics, fashion, electronics, and K-pop goods distinguishably; Reviews shows ≥3 attributed testimonials.

- [ ] T017 [P] [US3] Adapt `components/features.tsx` into `components/services.tsx` (§2) rendering `content.services` (what VyVy does: order-on-behalf, ship Korea→Vietnam, consolidation) (FR-005).
- [ ] T018 [P] [US3] Create/adapt `components/why-choose-us.tsx` (§3) rendering `content.trustPoints` (≥3 distinct trust reasons), folding in any reused trust-bar content (FR-006).
- [ ] T019 [P] [US3] Adapt `components/categories.tsx` (§5) rendering `content.categories` with distinguishable cards and non-empty `alt` text, including cosmetics, fashion, electronics, K-pop goods (FR-008, INV-4, INV-7).
- [ ] T020 [P] [US3] Adapt `components/testimonials.tsx` (§6) rendering `content.reviews` as attributed testimonials with optional rating/location (FR-009).
- [ ] T021 [US3] Insert §2, §3, §5, §6 sections into their slots in `app/page.tsx` in the mandated order (FR-015, INV-1, INV-8).

**Checkpoint**: All eight sections present in mandated order; all user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: SEO completeness, performance, accessibility, and end-to-end validation.

- [ ] T022 [P] Add `app/sitemap.ts` and `app/robots.ts` for the landing page (FR-014, SC-006).
- [ ] T023 [P] Add JSON-LD structured data (LocalBusiness/Service + AggregateRating derived from `content.reviews`) via a script tag in `app/page.tsx` or `app/layout.tsx` (FR-014, SC-006).
- [ ] T024 [P] Add a static Open Graph image to `public/` and reference it from the metadata in `app/layout.tsx` (FR-014).
- [ ] T025 Accessibility & i18n pass: verify a single logical heading hierarchy, non-empty `alt` on all meaningful images, ≥44px tap targets, correct Vietnamese diacritics, and legibility at ~150% font size (FR-017, SC-006).
- [ ] T026 Responsive pass: verify no horizontal overflow or overlapping/clipped content at 320px, 375px, 768px, and 1280px widths (SC-007).
- [ ] T027 Performance pass: run Lighthouse (mobile) on `pnpm build && pnpm start`; confirm Performance ≥ 90, SEO ≥ 90, and above-the-fold + primary CTA usable < 3s on a throttled mid-range profile (SC-004, SC-006).
- [ ] T028 Run full `specs/001-landing-page/quickstart.md` validation (scenarios V1–V9) and confirm every `checklists/requirements.md` item still holds.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Stories (Phase 3–5)**: All depend on Foundational. US1 → US2 → US3 in priority order, or in parallel if staffed (they touch different section components; only `app/page.tsx` insertion tasks are shared/sequential).
- **Polish (Phase 6)**: Depends on the user stories whose content it validates (T023 needs reviews from US3; T028 needs all sections).

### Key blocking notes

- T003 → T004/T005 (types before content/contact modules).
- T005 depends on T003 + T004.
- T009 (page shell) depends on T007/T008 and precedes all page-insertion tasks (T014, T016, T021).
- `app/page.tsx` is edited by T009, T014, T016, T021 — these are **sequential** (same file), not parallel.

### Within Each User Story

- Component tasks marked [P] are different files and can run in parallel.
- The page-insertion task in each story runs after that story's component tasks.

---

## Parallel Opportunities

- **Setup**: T002 [P] can run alongside T001 verification.
- **Foundational**: T006 [P] (globals.css) is independent of the lib/content tasks.
- **US1**: T010, T011, T012 [P] (hero, cta-section, contact-bar — different files) in parallel; T013 then T014.
- **US3**: T017, T018, T019, T020 [P] all in parallel; then T021.
- **Polish**: T022, T023, T024 [P] in parallel.
- **Cross-story**: With a team, US1/US2/US3 component work can proceed in parallel after Foundational; serialize only the `app/page.tsx` insertions.

---

## Parallel Example: User Story 1

```bash
# After Foundational (Phase 2) completes, launch US1 component tasks together:
Task: "Adapt components/hero.tsx (§1) to render from content.hero (T010)"
Task: "Adapt components/cta-section.tsx (§7) with Zalo/Kakao buttons (T011)"
Task: "Create components/contact-bar.tsx sticky mobile bar (T012)"
# Then: T013 (footer) → T014 (wire into app/page.tsx)
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1: Setup → 2. Phase 2: Foundational → 3. Phase 3: US1.
4. **STOP and VALIDATE**: quickstart V1–V3 (hero converts, contact reachable everywhere, links resolve).
5. This is a shippable MVP — the page already drives Zalo/Kakao contacts.

### Incremental Delivery

1. Setup + Foundational → shell ready.
2. US1 → validate → demo (MVP).
3. US2 → validate ordering-process comprehension.
4. US3 → validate trust/categories/reviews.
5. Polish → SEO/performance/a11y + full quickstart.

---

## Notes

- No automated tests generated (none requested); validation is via `quickstart.md`.
- [P] = different files, no dependencies. [Story] label maps to spec user stories.
- All content/copy changes live in `lib/content.ts` and `lib/contact.ts` (FR-016) — keep components content-free.
- Commit after each task or logical group; stop at any checkpoint to validate a story independently.
