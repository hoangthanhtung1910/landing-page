# Project Context

Code location:
./korean-shopping-proxy

Structure (monorepo — decision recorded 2026-07-16):
- korean-shopping-proxy/ is a pnpm-workspace monorepo. All application code lives inside it.
- apps/web    — public landing page (Next.js, relocated from the current root app)
- apps/admin  — admin dashboard (Next.js)
- apps/api    — CMS content API (NestJS)
- packages/content-types — shared TypeScript response types used by all apps

Technology:
- Next.js (App Router, RSC, ISR) — landing page + admin dashboard
- TypeScript
- TailwindCSS
- NestJS — CMS content API (modular monolith)
- MongoDB (Mongoose) — content revisions, page releases, media metadata, audit, users
- Object/media storage behind a storage abstraction (local adapter for dev; S3/CDN-ready)

Architecture (v1, decided):
- Content is edited as revisions; publishing validates the full page and atomically advances a
  page-release pointer.
- Admin auth: cookie-based sessions (HttpOnly/Secure/SameSite) + CSRF + restricted CORS. No JWT-in-JS.
- Media: public read, admin-only upload/update/delete; metadata in DB.
- Sections: required (Hero, Contact CTA, Footer) always render; optional (Services, Why-choose-us,
  Ordering-process, Categories, Reviews, FAQ) can be enabled/disabled by an admin.
- Landing page fetches published content server-side (SSG + ISR). No custom last-good snapshot:
  build/deploy is fail-closed (a build that can't fetch valid content fails instead of shipping an
  empty page); runtime resilience relies on Next.js ISR defaults.

Business:
Korea-Vietnam shopping proxy service (brand: VyVy Order Korea).

When implementing:
- Modify files inside korean-shopping-proxy only
- Do not create application code outside this folder
- Keep specs (specs/) and AI configs (CLAUDE.md, AGENTS.md, .specify/) in the workspace root

## Phase Handoff Workflow

- On completing a phase, Claude MUST create or update the report:
  `reviews/handoffs/phase-XX-claude.md`
- `XX` is the two-digit phase number, e.g. `phase-02-claude.md`.
- The report MUST include:
  - Phase and completion timestamp
  - Completed tasks
  - Unfinished tasks
  - Files created, modified, moved, or deleted
  - Technical decisions made
  - Lint, typecheck, build, and test results
  - Integration/end-to-end test results
  - Blockers, risks, and technical debt
  - Commands for Codex to re-run to verify
- Claude MUST keep `tasks.md` in sync with the real state.
- Claude MUST stop after the phase checkpoint and wait for Codex review before starting the next
  phase, unless the user explicitly allows otherwise.
- Reporting only in chat is not allowed; the in-workspace handoff report is mandatory.
- Claude MUST NOT mark a task complete unless its acceptance check or corresponding test passes.
