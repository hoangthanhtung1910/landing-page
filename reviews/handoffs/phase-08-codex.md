# Final implementation handoff — Codex

Date: 2026-07-23

## Outcome

All application work that can be completed and verified locally is implemented through
Phase 8. The public landing page, CMS API, MongoDB persistence, secure admin dashboard,
atomic publishing/rollback, media management, visibility controls, analytics consent,
SEO, health checks, backup/restore tooling, and CI configuration are present.

`specs/001-landing-page/tasks.md` has three intentionally open launch tasks:

- T052: connect the provided health/publishing signals to the selected production
  monitoring and alerting vendor.
- T056: run acceptance in a real staging environment.
- T057: supply and approve the final domain, genuine contact destinations, brand assets,
  SEO values, and named business approver.

The launch gate refuses release until those production inputs are supplied.

## Independent verification

- Workspace lint: pass.
- Typecheck/build chain: pass for shared types, web, API, and admin.
- Web contract/unit tests: 66/66 pass.
- API/Mongo integration and contract tests: 71/71 pass.
- Clean production web build: pass with Next.js 16.2.11.
- Fail-closed build: pass; build fails during prerender when
  `CMS_PUBLIC_URL=http://127.0.0.1:4999`.
- Browser QA:
  - public web at 320/375/768/1280 px: no overflow, broken images, unnamed links, empty
    alt text, or sub-44 px interactive targets;
  - admin at 320/768/1280 px: no overflow or sub-44 px controls;
  - no browser console warnings/errors.
- Lighthouse mobile: Performance 94, Accessibility 96, SEO 100; LCP 2993.8 ms,
  TBT 45 ms, CLS 0.
- `/public/content` local latency over 60 requests: p50 1.42 ms, p95 2.04 ms,
  max 49.34 ms.
- Dependency audit at high severity: pass (0 high/critical; 4 low and 8 moderate remain).
- MongoDB/media backup and restore: pass; restored into isolated database with
  21/21 collections and 40/40 documents matching.
- `git diff --check`: pass.

## Review entry points

- Public page: `korean-shopping-proxy/apps/web/app/page.tsx`
- Admin dashboard: `korean-shopping-proxy/apps/admin/components/admin-dashboard.tsx`
- Publishing: `korean-shopping-proxy/apps/api/src/releases/releases.service.ts`
- Media: `korean-shopping-proxy/apps/api/src/media/`
- Audit: `korean-shopping-proxy/apps/api/src/audit/`
- Operations: `korean-shopping-proxy/ops/runbook.md`
- CI: `korean-shopping-proxy/.github/workflows/ci.yml`
- Final API integration tests:
  `korean-shopping-proxy/apps/api/test/publishing-media.contract.test.ts`

## Launch note

Seed contact values and localhost URLs are development placeholders. The website is ready
for review and staging, but the production launch gate must remain blocked until T052,
T056, and T057 are completed with real external infrastructure and business inputs.
