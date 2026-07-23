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

## Phase Review Workflow

- When the user asks to review a phase, Codex MUST read the corresponding report in
  `reviews/handoffs/` (`phase-XX-claude.md`), cross-check it against `tasks.md`, inspect the Git diff,
  and re-run the appropriate checks (lint, typecheck, build, tests, and any end-to-end verification
  commands listed in the report).
- Claude's report is only a handoff claim; Codex MUST verify independently and not take it at face value.
- Codex MUST NOT modify application code during a review turn unless the user explicitly requests it.
- Claude produces these handoff reports per its own Phase Handoff Workflow (see `CLAUDE.md`); each phase
  has a matching `reviews/handoffs/phase-XX-claude.md`.
