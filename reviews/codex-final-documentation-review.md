# Codex Final Documentation Review

## Remaining Blockers

### 1. The contradictory downstream artifacts have not been refreshed

- **Severity:** BLOCKER
- **Remaining issue:** `research.md` still selects static local content and explicitly rejects a CMS; `data-model.md` still says there is no database; `contracts/content-model.md` still says there is no network API; `quickstart.md` still starts only one Next.js app; `contracts/admin-api.md` does not exist; the requirements checklist is stale.
- **Assessment:** The revised core documents correctly identify this problem, but adding Phase 0 tasks T0C–T0G does not resolve it. These files remain listed as implementation prerequisites and still contradict the intended system.
- **Required action:** Complete and approve T0C–T0G before any Phase 1 application work. Re-run the cross-document consistency review after those artifacts exist.
- **Affected files/sections:** `plan.md` — Project Structure and Downstream artifact impact; `tasks.md` — Phase 0; `research.md` — Decisions 2–3; `data-model.md` — introduction; `contracts/content-model.md` — entire contract; missing `contracts/admin-api.md`; `quickstart.md`; `checklists/requirements.md`.

### 2. Required governance and repository decisions are still open

- **Severity:** BLOCKER
- **Remaining issue:** The monorepo relocation still requires confirmation, `AGENTS.md` and `CLAUDE.md` still list only the original frontend stack, and the project constitution is still an unpopulated template.
- **Assessment:** T0A and T0B correctly make these prerequisites, but the decisions have not yet been recorded. All Phase 1 paths assume the `apps/web`, `apps/admin`, and `apps/api` layout.
- **Required action:** Confirm the relocation, update both agent-context files, and populate/approve the constitution before starting T001.
- **Affected files/sections:** `plan.md` — Constitution Check and Structure Decision; `tasks.md` — T0A–T0B and T001; `AGENTS.md`; `CLAUDE.md`; `.specify/memory/constitution.md`.

### 3. Durable last-good behavior remains an implementation choice rather than an architecture decision

- **Severity:** BLOCKER
- **Remaining issue:** The plan and T016 still specify “retained ISR output and/or persisted release snapshot.” These are different guarantees. Retained ISR output is hosting-dependent and does not inherently guarantee survival across redeployment, despite FR-030 and SC-012 requiring it.
- **Assessment:** The requirement is now strong, but the mechanism is still ambiguous. Claude would have to choose the persistence design and infer its deployment guarantees.
- **Required action:** During Phase 0, select one concrete durable design and state where the last-good artifact lives, who writes it, when it is updated, how it is validated, and how web generation reads it after cold start or redeployment. If retained ISR is used, document the selected host's persistence guarantees; otherwise require a persisted published snapshot.
- **Affected files/sections:** `spec.md` — FR-030 and SC-012; `plan.md` — Caching, revalidation & durable last-good; `tasks.md` — T016 and T048B.

### 4. Authentication transport and media access policy remain undecided

- **Severity:** BLOCKER
- **Remaining issue:** The architecture alternates between JWT/bearer terminology and secure cookie sessions. It also leaves media as “public or signed.” These choices determine CSRF protection, CORS, API contracts, browser behavior, caching, and stable media URLs.
- **Assessment:** Listing alternatives and mitigations is useful, but an implementation plan must choose a v1 policy before auth, admin clients, media schemas, or contracts are built.
- **Required action:** Resolve both choices in Phase 0 contracts and research. Specify the exact session transport and CSRF model, and define which media are public versus signed, including URL stability and cache behavior.
- **Affected files/sections:** `plan.md` — Primary Dependencies, Project Structure, Data flow, Authentication, Media storage and Security boundaries; `tasks.md` — T0C, T0E, T024, T028 and T028B.

## Remaining Consistency Issues

### 5. The customer-review requirement conflicts with the honest empty state

- **Severity:** HIGH
- **Remaining issue:** FR-009 unconditionally requires a reviews section presenting multiple testimonials, while US4, FR-041, FR-043, and the seed task correctly permit an honest empty state when no approved testimonials exist.
- **Impact:** Both behaviors cannot be mandatory at the same time. Acceptance tests may fail a compliant empty-state implementation or encourage fabricated seed reviews.
- **Required action:** Make FR-009 conditional: show multiple approved testimonials when available; otherwise render the defined honest empty state. Align the US4 checkpoint, which still says “reviews ≥3 attributed.”
- **Affected files/sections:** `spec.md` — FR-009, US4 and FR-041/FR-043; `tasks.md` — Phase 6 independent test, T015 and T040.

### 6. Fixed mandatory sections conflict with administrator-controlled visibility

- **Severity:** HIGH
- **Remaining issue:** FR-015 requires all eight sections to be presented, but FR-040 allows administrators to hide sections and FR-041 allows hiding an empty section.
- **Impact:** The public page cannot simultaneously contain all eight required sections and omit a hidden section. The page-release validator has no deterministic rule for which sections are required.
- **Required action:** Choose one rule. Either all eight structural slots always exist, with defined empty-state content, or selected sections are optional and FR-015 should govern relative order among visible sections. Reflect the rule in publication validation and the public contract.
- **Affected files/sections:** `spec.md` — FR-015, FR-040 and FR-041; `plan.md` — publishing validation; `tasks.md` — T029, T032 and T041.

### 7. FR-040 is incorrectly cited as the authorization-role requirement

- **Severity:** MEDIUM
- **Remaining issue:** `plan.md` and the CMS assumptions cite FR-040 for the single administrator role, but FR-040 defines section governance.
- **Impact:** Requirement traceability for authorization is inaccurate and may confuse contract and test coverage.
- **Required action:** Cite FR-025/FR-038 or add a dedicated authorization-scope requirement. Keep FR-040 references only for section behavior.
- **Affected files/sections:** `plan.md` — Authentication, session & authorization; `spec.md` — CMS architecture assumptions.

### 8. The plan still contains superseded data-model and auth terminology

- **Severity:** MEDIUM
- **Remaining issue:** The main architecture selects revisions and page releases, but Downstream artifact impact still says to promote each entity to a collection with `publishState`. The source tree and data-flow diagram still emphasize per-section modules and JWT even though later sections select a broader revisions/releases design and leave session transport open.
- **Impact:** Phase 0 authors may reproduce the old mutable-record model or assume JWT bearer storage.
- **Required action:** Make the plan use one vocabulary throughout: revisions, page releases, current-release pointer, selected session mechanism, and the final NestJS module boundaries.
- **Affected files/sections:** `plan.md` — Project Structure, Data flow, Authentication, and Downstream artifact impact.

## Remaining Task Gaps

### 9. Section visibility and deterministic empty-state behavior have no explicit implementation tasks

- **Severity:** HIGH
- **Remaining issue:** FR-040 grants section visibility control and FR-041 requires per-section empty-state rules, but T032 only generally names section editors and the public component tasks do not specify empty/hidden behavior.
- **Impact:** These requirements can be missed while every listed task is marked complete.
- **Required action:** After resolving the FR-015 conflict, add explicit tasks for section visibility data/UI, release validation, and defined empty rendering for every managed section.
- **Affected files/sections:** `spec.md` — FR-040/FR-041; `tasks.md` — T029, T032 and T037–T041.

### 10. Rollback lacks an administrator-facing workflow

- **Severity:** HIGH
- **Remaining issue:** T029B implements backend rollback, but no admin-dashboard task lets the non-developer administrator inspect the current/previous release, initiate rollback, confirm it, and see revalidation status.
- **Impact:** FR-035 may technically exist only as an API operation that the intended CMS user cannot use safely.
- **Required action:** Add an admin rollback workflow and end-to-end test, including confirmation, audit event, revalidation, success/failure status, and protection against stale release state.
- **Affected files/sections:** `spec.md` — FR-035 and US2; `tasks.md` — T029B, T029D, T030 and T032.

### 11. Several measurable success criteria still have no owned validation tasks

- **Severity:** MEDIUM
- **Remaining issue:** Tasks do not explicitly validate SC-002, SC-003, SC-005, SC-008, or SC-009. SC-001 is instrumented, but no post-launch measurement/owner is specified.
- **Impact:** The build can be declared complete without validating contact discoverability, process comprehension, perceived trust, publish latency from the administrator's perspective, or editing usability.
- **Required action:** Add named validation tasks or classify the criteria explicitly as post-launch KPIs with an owner, sample method, environment, and evidence location.
- **Affected files/sections:** `spec.md` — SC-001–SC-005 and SC-008–SC-009; `tasks.md` — validation and launch phases.

### 12. Task dependency order contradicts itself

- **Severity:** MEDIUM
- **Remaining issue:** Phase dependency text orders runtime schemas/DTOs before shared/generated types, while T009 and the key blocking notes require shared types before schemas T011–T013.
- **Impact:** Different implementers may begin foundational work in different orders.
- **Required action:** Select and state one order. A coherent order is approved contract/schema source, generated/shared response types, runtime DTO/schema implementation, then services/controllers/clients.
- **Affected files/sections:** `tasks.md` — Phase Dependencies, T009–T013 and Key blocking notes.

### 13. The module implementation tasks remain oversized

- **Severity:** MEDIUM
- **Remaining issue:** T025–T027 still combine schema/DTO, service, validation, draft revision behavior, CRUD, reorder, and controllers for several content types. A note says to treat concerns independently, but there is still one checkbox per large batch.
- **Impact:** Partial work cannot be tracked or reviewed reliably, and parallel execution remains ambiguous.
- **Required action:** Split each module batch into separately numbered tasks or subtasks with explicit dependencies and acceptance checks.
- **Affected files/sections:** `tasks.md` — T025–T027 and the task split note.

### 14. `apps/web/lib/contact.ts` is referenced but has no creation or migration task

- **Severity:** MEDIUM
- **Remaining issue:** T020 depends on `apps/web/lib/contact.ts`, but that file does not exist in the current application and no task explicitly creates it after the relocation.
- **Impact:** FR-011's Zalo/Kakao fallback contract can be omitted or improvised during component work.
- **Required action:** Add a foundational task to implement and test the contact-link builder from the refreshed contact-channel contract before CTA components depend on it.
- **Affected files/sections:** `plan.md` — Project Structure; `tasks.md` — Phase 2 and T020; `contracts/contact-channels.md`.

## Final Readiness Decision

All previous critical concerns are **represented** in the updated core documents, but they are not all **resolved**. Several remain pending Phase 0 work, and the core specification still contains direct contradictions around reviews and section visibility.

The architecture is therefore:

- **Ready for Phase 0 documentation and decision work:** Yes.
- **Ready for Phase 1+ application implementation:** No.

Application implementation may begin after:

1. T0A–T0G are completed and approved.
2. The durable last-good, session transport, media access, and relocation decisions are finalized.
3. FR-009 is reconciled with honest empty reviews.
4. FR-015 is reconciled with section visibility and empty-section behavior.
5. Missing section-visibility, empty-state, rollback-UI, contact-builder, and success-validation tasks are added.
6. The dependency order and oversized task batches are corrected.

No other remaining issue identified in this review needs to block Phase 0 remediation work.
