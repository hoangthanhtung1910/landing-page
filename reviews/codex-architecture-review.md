# Codex Architecture Review

## Summary

The project has a clear business purpose, target audience, primary conversion path, and appropriate high-level technology direction. A Next.js App Router public site backed by a NestJS/MongoDB CMS is a reasonable architecture for VyVy Order Korea, provided the CMS is deliberately designed as a publishing system rather than simple CRUD over mutable records.

The documentation is not ready for implementation. The revised `spec.md`, `plan.md`, and `tasks.md` describe a CMS platform, but `research.md`, `data-model.md`, `contracts/content-model.md`, and `quickstart.md` still describe the superseded static application. Several foundational decisions are also unresolved: safe draft/publish behavior, API contracts, authentication lifecycle, durable media storage, last-good-content behavior, deployment topology, and production content verification.

Documentation metrics:

- 32 functional requirements
- 12 success criteria
- 48 implementation tasks
- Four user stories covering visitor conversion, administration, process explanation, and trust-building
- Nominal task coverage is broad, but effective coverage is incomplete because important tasks depend on missing or contradictory contracts
- The project constitution remains an unpopulated template and therefore supplies no enforceable quality gates

The public-site requirements are stronger than the CMS and operational requirements. The landing-page conversion journey is understandable, but the editorial lifecycle, production security, deployment, monitoring, and content governance need further definition.

## Critical Issues

### 1. Revised and downstream artifacts define incompatible architectures

- **Problem:** The core documents describe a NestJS/MongoDB CMS, while `research.md` rejects a CMS, `data-model.md` states there is no database, `contracts/content-model.md` states there is no network API, and `quickstart.md` starts only one Next.js application.
- **Why it matters:** These documents are listed as implementation prerequisites. Claude could follow either the CMS model or the static content model and still appear compliant with part of the documentation. Shared types, schemas, frontend integration, validation, and test behavior cannot be implemented deterministically.
- **Recommended change:** Refresh all Phase 0/1 artifacts before implementation. Remove or clearly archive superseded static decisions. The revised artifacts must define MongoDB entities, runtime DTOs, public/admin API contracts, publishing semantics, local setup, and end-to-end validation.
- **Affected file and section:** `plan.md` — Downstream artifact impact; `research.md` — Decisions 2 and 3; `data-model.md` — introduction and all entities; `contracts/content-model.md` — contract and change model; `quickstart.md` — setup and validation.

### 2. Draft/publish semantics cannot protect the current live version

- **Problem:** The plan proposes a `publishState` field on mutable records, and T029 describes publication as a state toggle. It does not explain how an administrator edits published content as a draft while the previous version remains live.
- **Why it matters:** Changing a published record to draft may remove it from the public page. Editing it while it remains published may expose unapproved changes. Independently publishing records across collections may produce a mixed page containing parts of different editorial releases.
- **Recommended change:** Adopt a revision-based model. Preserve immutable or separately stored published revisions, maintain a working draft, validate the complete candidate page, and atomically switch a page-level published release pointer. Define rollback behavior and ensure failed publication leaves the prior release unchanged.
- **Affected file and section:** `spec.md` — FR-023, FR-026, FR-029 and concurrent-edit edge case; `plan.md` — Summary, Storage and Data flow; `tasks.md` — T010, T014 and T029–T030.

### 3. The public and administrative API contracts are missing

- **Problem:** The existing content contract defines a local TypeScript object. The planned `contracts/admin-api.md` does not exist.
- **Why it matters:** Endpoint paths, request and response bodies, identifiers, error envelopes, reorder rules, publish behavior, concurrency conflicts, authentication errors, media operations, and public cache/version fields are undefined. The API, admin dashboard, and public website can drift independently.
- **Recommended change:** Define versioned contracts before schemas or clients are implemented. Include authentication, admin list/detail/create/update/delete/reorder/publish endpoints, media operations, the aggregated public response, validation errors, not-found/conflict responses, release version, and compatibility rules.
- **Affected file and section:** `plan.md` — Project Structure and Downstream artifact impact; `tasks.md` — prerequisites and T009–T014, T025–T033; `contracts/content-model.md` — entire document; missing `contracts/admin-api.md`.

### 4. Authentication and authorization are underspecified for production

- **Problem:** Authentication is reduced to a seeded administrator, JWT login, a guard, and a browser client that attaches the token. Token storage, expiry, logout/revocation, credential rotation, password reset/provisioning, account disabling, rate limiting, CSRF, and XSS exposure are not defined. Authorization is effectively binary and has no explicit policy model.
- **Why it matters:** A compromised admin session permits public content, SEO, review, contact, and media manipulation. CORS and a JWT guard alone do not provide a secure administrative system.
- **Recommended change:** Define the v1 authorization scope explicitly, even if there is only one administrator role. Specify secure session/token transport, short-lived credentials, logout/revocation, password hashing policy, initial credential rotation, login throttling, account disabling, secret rotation, protected-route behavior, and security logging. Prefer `HttpOnly`, `Secure`, appropriately `SameSite` cookies unless another model is justified with mitigations.
- **Affected file and section:** `spec.md` — FR-025 and CMS assumptions; `plan.md` — Primary Dependencies, constraints and Data flow; `tasks.md` — T005, T008, T024, T031, T034 and T048.

### 5. “Last-good content” has no durable storage design

- **Problem:** T016 requests a last-good cache and safe fallback but does not define where it persists. A process-memory cache does not survive cold starts, deployments, multiple instances, or build workers.
- **Why it matters:** FR-030 and SC-012 promise successful rendering during API outages. The proposed implementation cannot guarantee that promise across realistic production failure modes.
- **Recommended change:** Choose and document one durable strategy. A suitable design is to let ISR preserve the last successfully generated page while failed regeneration leaves it untouched, optionally backed by a durable published snapshot. Define timeouts and failure semantics so malformed or partial API responses cannot replace the valid page. Test cold start, restart, deployment, timeout, malformed response, and partial dependency failure.
- **Affected file and section:** `spec.md` — CMS/API unavailable edge case, FR-030 and SC-012; `plan.md` — Technical approach and constraints; `tasks.md` — T016–T017 and T048.

### 6. Media storage is deferred even though it determines deployment behavior

- **Problem:** Local disk and object storage are treated as interchangeable. File validation, public access, naming, deletion, references, CDN behavior, and backups are not defined.
- **Why it matters:** Local disk is normally unsuitable for ephemeral or horizontally scaled services. An incorrect choice can break stable URLs, lose uploads after deployment, expose unsafe files, or leave orphaned assets.
- **Recommended change:** Select object storage for production and a compatible local adapter for development. Define permitted MIME types using content inspection, file and dimension limits, generated object keys, public versus signed access, image transformation, CDN/cache policy, reference-aware deletion, orphan cleanup, backup/retention, and Next.js remote-image configuration.
- **Affected file and section:** `spec.md` — FR-027 and CMS assumptions; `plan.md` — Storage and source structure; `tasks.md` — T005, T013, T028 and T033.

### 7. Deployment and operational architecture have no implementation phase

- **Problem:** The plan describes three deployable applications plus MongoDB and media storage, but tasks contain no deployment, CI/CD, migration, health check, monitoring, backup, alerting, or rollback work.
- **Why it matters:** Publishing, stable media, cache invalidation, authentication, recovery, and availability cannot be verified without a concrete topology. A locally functional CMS is not a deployable platform.
- **Recommended change:** Add an operations phase covering target hosting, domains/TLS, network reachability, database and object-storage provisioning, environment validation, secrets, indexes, seed/migration execution, health/readiness endpoints, structured logs, monitoring, backups and restore tests, CI quality gates, deployment order, staging, and rollback.
- **Affected file and section:** `plan.md` — Target Platform, Project Type and CMS assumptions; `tasks.md` — Phase 1 environment work and Phase 7 cross-cutting work.

### 8. Placeholder testimonials and contact information conflict with trust and conversion goals

- **Problem:** The spec permits placeholder reviews and contact handles, while the page is expected to present credible social proof and potentially emit `AggregateRating` structured data.
- **Why it matters:** Invented or ambiguous testimonials undermine the business's primary trust objective and may make structured data misleading. Placeholder Zalo/Kakao destinations directly break the primary conversion flow.
- **Recommended change:** Add a production content gate. Do not present invented reviews as actual customers; use an honest empty state until approved testimonials and consent are available. Emit rating structured data only when eligible real reviews exist. Require verified production contact destinations and named business approval before launch.
- **Affected file and section:** `spec.md` — US4, no-content edge cases, assumptions and SC-005; `plan.md` — SEO approach inherited from research; `tasks.md` — T015, T043 and launch validation.

## Important Improvements

### 1. Whole-section management is ambiguous

- **Problem:** FR-015 fixes exactly eight sections and their order, while the architecture direction refers to landing-page section management.
- **Impact:** Implementers cannot tell whether administrators may hide, schedule, add, or reorder whole sections, or only edit records inside fixed sections.
- **Recommendation:** Define v1 explicitly. A reasonable scope is fixed section types/order, with optional visibility controls and item-level ordering; adding arbitrary section types can remain out of scope.

### 2. Concurrent editing uses unsafe last-write-wins behavior

- **Problem:** The concurrent-edit edge case accepts last-write-wins.
- **Impact:** One administrator can unknowingly overwrite another administrator's work.
- **Recommendation:** Use optimistic concurrency through a version or revision identifier and return a conflict that the dashboard can explain and resolve.

### 3. Audit logs and content history are missing

- **Problem:** Neither requirements nor tasks cover auditability or revision history.
- **Impact:** The business cannot identify who changed contact details, reviews, SEO, or published content, and cannot reliably recover from accidental changes.
- **Recommendation:** Record administrator, action, entity/revision, timestamp, publish release, and before/after reference. Provide rollback to a prior published release or explicitly define it as a follow-on milestone.

### 4. Several tasks are too large to review or verify independently

- **Problem:** T025–T027 group multiple NestJS modules and all CRUD/reorder/publish behavior; T032 groups every dashboard editor; T048 groups security, resilience, and full validation.
- **Impact:** Partial completion is difficult to detect, parallel work becomes risky, and reviews cannot tie a change to a narrow acceptance criterion.
- **Recommendation:** Split tasks per content module and concern: schema/DTO, service, controller, contract test, editor UI, reorder UI, publish UI, and error states.

### 5. Admin loading, error, unsaved-change, and retry behavior is not planned

- **Problem:** Dashboard tasks name forms and lists but omit loading, empty, unauthorized, validation, network-failure, stale-edit, unsaved-change, and publish-failure states.
- **Impact:** Non-developers may lose work or believe failed content was published.
- **Recommendation:** Add explicit UX tasks and acceptance checks for all administrative states, including accessible error summaries and safe retry behavior.

### 6. Public cache and revalidation semantics are incomplete

- **Problem:** ISR and an on-publish route are selected, but cache tags/keys, TTL, response headers, timeout, retry, and failed-trigger handling are not defined.
- **Impact:** Content may remain stale beyond the five-minute target or the site may over-fetch the API.
- **Recommendation:** Define release-aware caching, on-demand invalidation, periodic safety revalidation, persistent retry for failed invalidations, and observability for publish-to-live latency.

### 7. The desktop contact requirement may not be met

- **Problem:** The mobile contact bar is sticky, but desktop relies on header CTAs without explicitly requiring a sticky header.
- **Impact:** FR-012 requires contact reachability from every scroll position on all supported layouts.
- **Recommendation:** Make the desktop header sticky or provide a desktop floating contact affordance, and add a viewport-specific acceptance test.

### 8. Conversion measurement is assumed rather than implemented

- **Problem:** SC-001 requires an 8% contact-tap rate, but no task defines CTA analytics events, consent behavior, attribution, or reporting. SC-002, SC-003, SC-005, and SC-009 also lack owned validation tasks.
- **Impact:** The team cannot determine whether the platform meets its business outcomes.
- **Recommendation:** Add analytics events containing channel and CTA placement, define privacy behavior, and assign pre-launch/post-launch validation tasks for the user-study criteria.

### 9. MongoDB is acceptable, but the proposed collection model is unnecessarily fragmented

- **Problem:** A separate collection per small singleton/list section increases aggregation and publication complexity.
- **Impact:** Page reads require multiple queries and atomic publication becomes harder.
- **Recommendation:** Prefer a page/release document containing section configuration and ordered references, with separate collections only where independent lifecycle or volume justifies them, such as media, users, audit events, and potentially reusable reviews/categories.

### 10. Shared TypeScript interfaces are being treated as runtime contracts

- **Problem:** The plan implies that one shared type package can back API DTOs.
- **Impact:** TypeScript interfaces disappear at runtime and cannot validate untrusted requests or database documents.
- **Recommendation:** Keep shared response types or schemas, but define runtime validation explicitly. Generate types from an OpenAPI/schema source where practical, or maintain contract tests to prevent drift.

### 11. Test coverage is too narrow

- **Problem:** Automated tests focus on unauthenticated writes, invalid content, and draft leakage.
- **Impact:** Publishing integrity, concurrency, cache invalidation, media security, authentication lifecycle, admin workflows, accessibility, and failure recovery can regress undetected.
- **Recommendation:** Add contract, integration and end-to-end tests for those behaviors, plus automated accessibility and metadata checks.

### 12. Existing Next.js safety and performance settings conflict with project goals

- **Problem:** `next.config.mjs` currently ignores TypeScript build errors and disables image optimization.
- **Impact:** Invalid code can reach production, and CMS-provided imagery may undermine SC-004 and Lighthouse goals.
- **Recommendation:** Add tasks to restore build-time type enforcement, configure optimized remote images and allowed origins, and verify responsive image dimensions and formats.

### 13. The monorepo relocation is still an explicit blocker

- **Problem:** The plan and T001 require confirmation before moving the current application into `apps/web`.
- **Impact:** All later task paths depend on that layout.
- **Recommendation:** Record the decision before implementation and update `AGENTS.md` and `CLAUDE.md` to describe the complete approved stack and layout.

### 14. The specification checklist is stale

- **Problem:** The checklist says all requirements are unambiguous and complete but predates the CMS revision.
- **Impact:** It provides a false readiness signal.
- **Recommendation:** Re-run the checklist after CMS requirements, contracts, and operational requirements are corrected.

## Optional Improvements

- Add scheduled publish and unpublish times.
- Add authenticated preview URLs for draft releases.
- Add soft deletion and restore for content and media.
- Add page-release rollback in the admin dashboard.
- Add editor/publisher role separation when the administrative team grows.
- Add media focal-point and responsive-crop controls.
- Add warnings for missing alt text, invalid contact links, excessive SEO lengths, unreferenced media, and incomplete sections.
- Add webhook/event abstractions for future consumers of published content.
- Track conversion separately for hero, sticky bar, process CTA, dedicated CTA, header, and footer.
- Add an API `ETag` or release identifier so clients and diagnostics can identify the exact published version.
- Consider a modular-monolith NestJS design initially; separate services are not justified by the current scale.

## Missing Requirements

### Requirements to add to `spec.md`

1. **Publishing integrity:** Editing a published item must not alter or remove the currently public version before an explicit successful publish.
2. **Atomic release:** A visitor must receive one internally consistent published page version.
3. **Preview policy:** Define draft preview behavior or explicitly defer preview from v1.
4. **Concurrency control:** Detect stale administrative edits and prevent silent overwrite.
5. **Auditability:** Attribute content changes and publication actions to an administrator.
6. **Authentication lifecycle:** Define session expiry, logout/revocation, provisioning, reset/rotation, disablement, and login throttling.
7. **Authorization scope:** Define the v1 administrator role and route permissions; explicitly defer granular roles if appropriate.
8. **Media security:** Define permitted files, size/dimension limits, storage, access, deletion, and retention.
9. **Review authenticity and consent:** Require approval and appropriate consent for testimonial names, locations, avatars, text, and ratings.
10. **Analytics:** Record Zalo/Kakao activation with channel and placement so SC-001 is measurable.
11. **Privacy:** Define analytics disclosure and treatment of review/customer personal data.
12. **Operational resilience:** Require backups, restore capability, health checks, monitoring, and alerting for publication failures.
13. **Production launch gate:** Require verified contact details, approved reviews, final canonical domain, brand assets, SEO content, and legal destinations.
14. **Section governance:** Define whether sections may be hidden, reordered, scheduled, or only edited internally.
15. **API compatibility:** Require versioned, stable public and administrative contracts.
16. **Migration:** Require existing static content to be seeded/imported and compared with the CMS output before the static source is removed.
17. **Deterministic empty states:** Define whether each empty section is hidden, blocked from publication, or rendered with an honest empty state.
18. **Accessibility baseline:** Expand beyond font size and tap targets to keyboard access, focus visibility, labels, contrast, landmarks, and error messaging.

### Requirements to add to `plan.md`

- A revision and page-release data model with atomic publish and rollback behavior.
- A complete authentication/session and authorization design.
- Object-storage architecture and local development adapter.
- Public and admin API contract strategy, including versioning and errors.
- Cache, ISR, invalidation, timeout, retry, and last-good-snapshot behavior.
- Audit logging and optimistic concurrency architecture.
- Concrete deployment topology for web, admin, API, MongoDB, and media.
- Environment separation for local, staging, and production.
- Health checks, structured logging, metrics, alerting, backup, restore, and rollback.
- MongoDB indexes and uniqueness constraints.
- Clear Server Component and Client Component boundaries: public content and metadata fetched by server code; interactive admin forms isolated as client components where necessary.
- Security boundaries for public API, admin API, media URLs, revalidation endpoint, and administrative browser sessions.

### Requirements to add to `tasks.md`

- Refresh `research.md`, `data-model.md`, contracts, `quickstart.md`, and the requirements checklist.
- Author and approve public/admin API contracts before shared types, schemas, or clients.
- Confirm the monorepo relocation and update project context files.
- Implement revisions, atomic releases, optimistic concurrency, audit events, and rollback.
- Harden authentication and add authorization-policy tests.
- Configure production-compatible media storage and security validation.
- Add admin loading/error/conflict/unsaved/publish-failure states.
- Add CTA analytics and success-criteria validation.
- Add static-content migration and parity verification.
- Add public contract, publishing, media, auth, concurrency, cache, revalidation, accessibility, and admin end-to-end tests.
- Add database indexes, migration/seed controls, and safe repeatability.
- Add CI checks for formatting, linting, types, tests, builds, security scanning, and contract compatibility.
- Add deployment, staging acceptance, health checks, monitoring, backups, restore testing, and rollback.
- Restore Next.js type checking and image optimization.
- Add a production content verification and launch checklist.

## Architecture Recommendations

### `specs/001-landing-page/spec.md`

- Retain the existing visitor conversion, mobile, Vietnamese-language, and SEO goals; they provide a strong business foundation.
- Refine the CMS from CRUD terminology into an editorial lifecycle: draft, preview, validate, publish atomically, observe, and roll back.
- Define the precise v1 administrative role and explicitly list deferred authorization capabilities.
- Add content authenticity, privacy, analytics, accessibility, concurrency, audit, and launch-gate requirements.
- Make empty-section and API-failure behavior deterministic and testable.
- Separate buildable acceptance criteria from post-launch business KPIs. Keep SC-001 and similar outcomes, but give them an instrumentation and measurement owner.
- Define the refresh SLA precisely: trigger, maximum delay, retry behavior, and what the administrator sees on failure.

### `specs/001-landing-page/plan.md`

- Regenerate or rewrite all stale Phase 0/1 artifacts before accepting the plan.
- Use a page-level release/snapshot as the public source rather than assembling independently changing records without a release boundary.
- Organize NestJS as a modular monolith with modules for authentication/users, content/revisions, releases/public delivery, media, audit, and health/operations.
- Treat MongoDB as suitable for the expected low-volume content workload, but optimize modeling for atomic publication rather than one collection per visual section by default.
- Keep public content and metadata fetching in Next.js server code. Use Client Components only where browser interactivity is required; the admin application will naturally contain more client-side form components.
- Define a durable outage strategy based on retained ISR output and/or a published snapshot, not process memory.
- Choose production object storage and configure Next.js image optimization against it.
- Add a concrete security model, deployment diagram, environment matrix, and operational recovery design.
- Populate the project constitution with security, testing, review, and deployment gates so Spec Kit has actual governance authority.

### `specs/001-landing-page/tasks.md`

- Insert a documentation/decision phase before T001. No application task should begin while contracts and data models contradict the plan.
- Place dependencies in this order: approved architecture decisions → data model → API contracts → runtime schemas/DTOs → shared/generated types → backend behavior → clients and admin UI → integration tests → deployment.
- Split broad tasks by module and behavior so each has one verifiable outcome.
- Add explicit dependency links for authentication, publication, revalidation, media, and shared contract work.
- Move the “shippable MVP” checkpoint until the intended MVP definition is met. If self-service CMS management is the purpose of this revision, seeded API content without the admin UI is a technical demo, not the completed CMS MVP.
- Add automated quality, security, deployment, monitoring, migration, and production-content tasks.
- Add acceptance checks for desktop contact reachability, administrative error states, stale edits, failed publishing, and last-good rendering after cold starts.

## Implementation Readiness

### 1. Is the project ready for Claude implementation?

No. The project is not ready for implementation against the current artifacts. The application stack is reasonable, but the documentation contains direct architecture contradictions and leaves several security and data-integrity decisions for the implementer to invent.

### 2. What must be fixed before implementation?

The following are blocking:

1. Align `research.md`, `data-model.md`, contracts, `quickstart.md`, and the checklist with the revised CMS architecture.
2. Confirm the monorepo relocation and update `AGENTS.md`/`CLAUDE.md` with the approved stack and structure.
3. Define revision-based drafts, atomic page releases, concurrency behavior, and rollback.
4. Author complete public and administrative API contracts.
5. Define the authentication/session and v1 authorization model.
6. Choose production media storage and specify media security.
7. Define durable last-good content, cache invalidation, retry, and failure behavior.
8. Add deployment, migration, testing, monitoring, backup, and recovery plans and tasks.
9. Add a production gate for genuine testimonials and verified contact information.

After these corrections, rerun Spec Kit planning and task generation or perform an equivalent controlled refresh, then run another cross-artifact review before `/speckit-implement`.

### 3. What can be postponed?

The following can be deferred if explicitly recorded as out of scope for v1:

- granular editor/publisher role hierarchies, provided one administrator role is securely defined
- scheduled publishing
- arbitrary new section types and drag-and-drop whole-page composition
- multilingual content
- advanced media transformations and focal-point editing
- full long-term revision browsing, provided at least the current and previous published release can be recovered
- CDN-specific optimization beyond a reliable object-store and Next.js image baseline
- reusable multi-page CMS capabilities
- visitor accounts, checkout, payment, and order tracking

Auditability, safe publication, authentication security, verified contact data, genuine testimonials, deployment, and recovery should not be postponed.
