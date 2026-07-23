# Phase 01 Handoff — Setup (Monorepo, Scaffolds, ESLint)

**Phase:** 1 (Setup, tasks T001–T006B + Codex Phase-1 fixes)
**Completed:** 2026-07-17
**Author:** Claude (handoff claim — Codex verifies independently)

Ground rules: code only inside `korean-shopping-proxy/`; no production deploy; not committed; env-driven URLs.
Toolchain: Node 20.20.1 · pnpm 9.15.4 (corepack).

## 1. Completed tasks
- **T001** pnpm workspace (`pnpm-workspace.yaml` + root `package.json`); landing page relocated to `apps/web/` via `git mv`.
- **T002** NestJS scaffold `apps/api/`. **T003** admin scaffold `apps/admin/`. **T004** `packages/content-types/` skeleton.
- **T005** `docker-compose.yml` (Mongo 7) + `.env.example` ×3 (all URLs/CORS/media-origin via env).
- **T006** removed `pricing.tsx` (kept `faq.tsx`, FR-050). **T006B** hardened `apps/web/next.config.mjs` (typecheck ON, image optimization ON, `remotePatterns` scoped to `/media/**`, fail-closed on invalid `MEDIA_ORIGIN`).
- **Codex Phase-1 fixes:** real ESLint 9 flat config across all projects (`pnpm lint` passes); admin API URL → `NEXT_PUBLIC_CMS_ADMIN_API_URL` (direct browser-to-API); plan.md security boundaries corrected (public media, admin-only mutation, no signed URLs).

## 2. Unfinished tasks
- None for Phase 1; all setup tasks complete. Data layer and beyond are Phase 2+.

## 3. Files created / modified / moved
- **Moved (git mv):** `app/`, `components/`, `lib/`, `public/`, configs → `apps/web/`.
- **Created:** `pnpm-workspace.yaml`, root `package.json`, `docker-compose.yml`, `apps/api/*` scaffold, `apps/admin/*` scaffold, `packages/content-types/*`, 3× `.env.example`, `eslint.config.base.mjs` + 4× `eslint.config.mjs`.
- **Deleted:** `components/pricing.tsx`.
- **Modified:** `.gitignore`, `apps/web/next.config.mjs`, `apps/web/app/page.tsx` (removed Pricing), root + app `package.json` (ESLint deps/scripts).

## 4. Technical decisions
- Monorepo `apps/{web,admin,api}` + `packages/content-types`.
- Admin = direct browser-to-API with cookie credentials → admin URL is `NEXT_PUBLIC_`.
- ESLint 9 flat config: `@eslint/js` + `typescript-eslint` + `@next/eslint-plugin-next` (web/admin).

## 5. Lint / build / test results
```
pnpm -r lint          → 4/4 Done, 0 error / 0 warning
content-types / api / admin / web builds → all OK
invalid MEDIA_ORIGIN  → web build fails (exit 1)  [fail-closed config]
```

## 6. Integration / end-to-end
- N/A (no runtime data layer yet). Builds are the acceptance for setup.

## 7. Blockers / risks / technical debt
- No blockers. Physical relocation authorized by user. Not committed.

## 8. Commands for Codex to re-run
```bash
cd korean-shopping-proxy
corepack pnpm@9.15.4 install
corepack pnpm@9.15.4 -r lint
corepack pnpm@9.15.4 --filter @vyvy/content-types build
corepack pnpm@9.15.4 --filter api build
corepack pnpm@9.15.4 --filter admin build
corepack pnpm@9.15.4 --filter web build
# fail-closed config check (expect exit 1):
MEDIA_ORIGIN="not-a-url" corepack pnpm@9.15.4 --filter web exec next build
```
