# VyVy Order Korea — Project Constitution

Governance for the VyVy Order Korea landing page + CMS (feature `001-landing-page`). These
principles are binding quality gates: every plan, task, and review MUST demonstrate compliance,
and any deviation MUST be justified in the plan's Complexity Tracking.

## Core Principles

### I. Publishing Integrity (NON-NEGOTIABLE)
Content is edited as revisions; the live page is a page-level release. Editing a published item
MUST NOT change the live page before an explicit, successful publish. Publishing MUST validate the
complete candidate page and switch the current-release pointer atomically; a failed publish MUST
leave the prior release live and internally consistent. Visitors always receive exactly one release.
Rollback to the previous release MUST be possible. Concurrency uses optimistic version checks (409 on
stale writes) — never silent last-write-wins. Build/deploy is fail-closed: a build that cannot fetch
valid published content MUST fail rather than promote an empty page to production. No custom durable
last-good snapshot is built; runtime resilience relies on Next.js ISR defaults.

### II. Security by Default (NON-NEGOTIABLE)
Admin write endpoints require authentication (cookie-based sessions: HttpOnly/Secure/SameSite +
CSRF + restricted CORS). The public endpoint exposes only published, enabled content — never drafts,
disabled sections, or admin-only fields. Untrusted input (requests and stored documents) is validated
at runtime, not just typed. Media uploads are admin-only, content-inspected, and size/dimension
limited. Secrets live in environment configuration, validated on boot. Auth and publish actions are
audit-logged.

### III. Test-First for Real Logic
Auth lifecycle, authorization, validation, publishing integrity/atomic release, optimistic
concurrency, media security, audit, and fail-closed build integrity MUST have automated tests. Public and admin
API contracts have contract tests to prevent drift. Tests for a behavior are written and reviewed
before that behavior is considered done. Pure UI/visual work is validated via quickstart scenarios
plus automated accessibility/metadata checks.

### IV. Authentic, Accessible Public Experience
No fabricated testimonials or placeholder contact destinations reach production. Sections with no
approved content render a defined honest empty state (required sections) or are disabled (optional
sections). The public page is mobile-first, Vietnamese, SEO-sound, and meets an accessibility baseline
(keyboard access, visible focus, labels/landmarks, contrast, ≥44px targets, legibility at enlarged
font sizes).

### V. Contract-Driven & Versioned
Public and admin API contracts are authored and approved before schemas, clients, or UI are built.
Contracts are versioned; breaking changes require an explicit version bump. Shared TypeScript types
describe response shapes only — runtime validation is separate. Design artifacts (research, data
model, contracts, quickstart) MUST stay internally consistent with spec.md and plan.md.

## Additional Constraints — Technology & Structure

- Stack: Next.js + TypeScript + TailwindCSS (web/admin); NestJS + MongoDB (API, modular monolith);
  storage abstraction for media (local dev adapter, S3/CDN-ready).
- All application code lives inside `korean-shopping-proxy/` (pnpm-workspace monorepo:
  `apps/web`, `apps/admin`, `apps/api`, `packages/content-types`).
- Specs (`specs/`) and AI configs (`CLAUDE.md`, `AGENTS.md`, `.specify/`) live in the workspace root.
- The landing page renders pre-generated HTML (SSG + ISR); no client-only content fetching for SEO.
- `next.config` MUST NOT ignore TypeScript build errors and MUST NOT disable image optimization.

## Development Workflow — Quality Gates

- **Phase 0 gate**: architecture decisions recorded and all design artifacts/contracts consistent
  before any application code.
- **CI gate**: format, lint, typecheck, tests, build, security scan, and API contract-compatibility
  checks must pass.
- **Review gate**: every change traces to a requirement (FR/SC) and passes the principles above;
  security- or data-integrity-affecting changes get explicit review.
- **Deployment gate**: deploy order (API + DB + storage before web/admin), staging acceptance,
  health checks, backups with tested restore, and a rollback path.
- **Launch gate**: verified real contact destinations, approved genuine testimonials (or honest
  empty state), final domain/brand assets/SEO, and named business approval.

## Governance

This constitution supersedes ad-hoc practices for this feature. Amendments are made by editing this
file with a version bump and a dated note. Complexity or deviations from these principles MUST be
justified in `plan.md` (Complexity Tracking). When guidance conflicts, order of precedence is:
this constitution → spec.md → plan.md → tasks.md → downstream artifacts.

**Version**: 1.0.0 | **Ratified**: 2026-07-16 | **Last Amended**: 2026-07-16
