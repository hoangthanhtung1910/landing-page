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
- TailwindCSS v4
- TailAdmin Free Next.js Admin Dashboard — visual/layout reference for apps/admin
- Lucide React — admin interface icons
- NestJS — CMS content API (modular monolith)
- MongoDB (Mongoose) — content revisions, page releases, media metadata, audit, users
- Object/media storage behind a storage abstraction (local adapter for dev; S3/CDN-ready)

Architecture (v1, decided):
- Content is edited as revisions; publishing validates the full page and atomically advances a
  page-release pointer.
- Admin auth: cookie-based sessions (HttpOnly/Secure/SameSite) + CSRF + restricted CORS. No JWT-in-JS.
- Media: public read, admin-only upload/update/delete; metadata in DB.
- MongoDB collection names are explicit, plural `snake_case` (for example
  `admin_sessions`, `contact_channels`, and `page_releases`); do not rely on Mongoose's implicit
  collection-name pluralization.
- Contact channels support Zalo, Kakao, Messenger, phone, email, and generic social links. Messenger
  stores a Facebook username/Page ID and the web app derives `https://m.me/<handle>`.
- Sections: required (Hero, Contact CTA, Footer) always render; optional (Services, Why-choose-us,
  Ordering-process, Categories, Reviews, FAQ) can be enabled/disabled by an admin.
- Landing page fetches published content server-side (SSG + ISR). No custom last-good snapshot:
  build/deploy is fail-closed (a build that can't fetch valid content fails instead of shipping an
  empty page); runtime resilience relies on Next.js ISR defaults.

Business:
Korea-Vietnam shopping proxy service (brand: VyVy Order Korea).

## Admin UI Integration

- `apps/admin` uses an adapted TailAdmin Free visual system and layout, not a wholesale copy of the
  upstream repository. Attribution and the upstream MIT license reference are recorded in
  `apps/admin/TAILADMIN-NOTICE.md`.
- `apps/admin/components/tailadmin-shell.tsx` owns the responsive sidebar, header, navigation groups,
  user controls, and light/dark theme toggle.
- `apps/admin/components/admin-dashboard.tsx` retains the existing CMS behavior and renders it inside
  `TailAdminShell`. Treat the shell as the presentation layer: do not replace the existing API calls,
  cookie session flow, CSRF handling, publishing workflow, or editor state when changing the theme.
- Admin list sections (services, trust points, process steps, categories, reviews, FAQ, and contact
  channels) use responsive management tables. Each row exposes edit, reorder, and delete actions;
  create and edit forms open in the shared modal instead of rendering full forms inline. Keep
  singleton sections such as Hero, SEO, Brand, CTA, and Footer as direct editor forms.
- Admin styling and TailAdmin-inspired design tokens live in `apps/admin/app/globals.css`. Tailwind v4
  is loaded through `apps/admin/postcss.config.mjs`; admin icons come from `lucide-react`.
- The selected admin color mode is stored in local storage under `vyvy-admin-theme`, with the `dark`
  class applied to the document root. New admin components must support both light and dark modes and
  preserve keyboard focus states and responsive behavior.
- Keep VyVy branding and Vietnamese CMS labels when adapting upstream TailAdmin examples. Do not add
  unused TailAdmin demo pages, authentication implementations, charts, or dependencies merely to
  mirror the template.
- The admin dev server uses `http://localhost:3001` via `pnpm dev:admin`. Before starting another
  instance, reuse or stop any existing process listening on port 3001; `EADDRINUSE` means the port is
  already occupied, not that the admin build is broken.
- After admin UI changes, run at least `pnpm --filter admin lint` and `pnpm build:admin`, then visually
  verify desktop and mobile layouts in both light and dark modes.

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
