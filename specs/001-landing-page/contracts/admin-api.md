# Contract: Admin CMS API

**Feature**: 001-landing-page | **Date**: 2026-07-16 (new — CMS architecture)

The authenticated administrative API the admin dashboard uses to manage content, media, visibility,
and publishing. **Versioning (v1 = current unversioned paths):** the canonical v1 admin surface uses
the paths below with no version prefix (e.g. `/auth/login`, `/content/...`); path-based versioning is
**explicitly deferred** and introduced only on the first breaking change (FR-047). All routes require
an authenticated admin session.

## Authentication (cookie sessions)

Cookie-based sessions — `HttpOnly` cookie, `Secure` in production, `SameSite`; server-side session
record; CSRF protection on state-changing requests; CORS restricted to the web/admin origins
(FR-025, FR-038). No JWT/bearer-in-JS.

| Method | Path | Body | Behavior |
|--------|------|------|----------|
| POST | `/auth/login` | `{ username, password }` | Verify hashed password + enabled account; set session cookie; throttle repeated failures |
| POST | `/auth/logout` | — | Invalidate the server-side session (revocation) |
| GET | `/auth/me` | — | Current admin identity (or `401`) |
| GET | `/auth/csrf` | — | Issue/refresh a CSRF token for the session |

- Disabled accounts and expired/revoked sessions are rejected with `401`.
- Login is rate-limited; lockout/backoff on repeated failures (FR-038).

## Content management (per section)

Each managed content type exposes list/detail/create/update/delete/reorder. `{type}` ∈
`hero`, `services`, `trust-points`, `process-steps`, `categories`, `reviews`, `faq`, `contact`, `seo`.
Singletons (`hero`, `contact` set, `seo`, `footer`, `brand`) use detail/update (no create/delete of the
singleton itself). Writes operate on **draft revisions** and never mutate the live release (FR-033).

| Method | Path | Notes |
|--------|------|-------|
| GET | `/content/{type}` | List items (drafts + published), incl. `version` and `publishState` |
| GET | `/content/{type}/{id}` | Item detail |
| POST | `/content/{type}` | Create a draft item (list types) |
| PUT | `/content/{type}/{id}` | Update — **MUST send the current `version`** (optimistic concurrency) |
| DELETE | `/content/{type}/{id}` | Delete a draft/list item |
| GET | `/content/{type}/order` | Current ordering: `{ orderedIds: string[], version: number }` |
| POST | `/content/{type}/reorder` | `{ orderedIds: string[], orderVersion: number }` — reorder list items |

- **Optimistic concurrency (FR-036)**: `PUT`/`DELETE` include the client's `version`; a mismatch
  returns `409 Conflict` (see error model). No silent overwrite.
- **Ordering concurrency**: a list's display order is stored as ONE document (`orderedIds` + `version`)
  so a reorder is a single atomic write. `POST .../reorder` MUST send the current `orderVersion` (read
  from `GET .../order`); a stale value returns `409`, so of two concurrent reorders exactly one commits.
  Creating/deleting an item also bumps `orderVersion`, invalidating a reorder prepared against the old list.
- **Validation (FR-029)**: required fields, field formats, rating range (1–5), contiguous step order,
  non-empty image alt text. Invalid input returns `422` and leaves stored content unchanged.

## Section visibility

| Method | Path | Body | Notes |
|--------|------|------|-------|
| GET | `/sections/visibility` | — | Current enable/disable state per optional section |
| PUT | `/sections/visibility` | `{ [section]: boolean }` | Toggle optional sections; required sections (hero, cta, footer) cannot be disabled → `422` |

(FR-040, FR-051)

## Media

Admin-only upload/update/delete; public read (FR-027, FR-039).

| Method | Path | Body | Notes |
|--------|------|------|-------|
| POST | `/media` | multipart file + `alt` | MIME allowlist (content-inspected), size/dimension limits; returns `{ id, url, alt, width, height }` |
| GET | `/media` | — | List assets |
| DELETE | `/media/{id}` | — | Reference-aware: `409` if referenced by the current release |

## Publishing, rollback & releases

| Method | Path | Body | Behavior |
|--------|------|------|----------|
| POST | `/publish` | — | Validate the full candidate page; write a new release; advance the current-release pointer atomically; trigger revalidation (FR-034) |
| POST | `/rollback` | — | Revert the pointer to the previous release; audit (FR-035) |
| GET | `/releases` | — | List releases (at least current + previous) with `releaseNumber`, `publishedAt`, publisher |
| GET | `/releases/current` | — | Current release summary |

- **Publish validation failure** returns `422` with the per-section problems; the prior release stays
  live (FR-034). **Partial/atomic failure** leaves the pointer unchanged.
- On publish, the API calls the web app's secret-guarded revalidation route; failed triggers are
  retried and surfaced (FR-048).

## Audit

| Method | Path | Notes |
|--------|------|-------|
| GET | `/audit` | List audit events (actor, action, target, release, timestamp) (FR-037) |

Every create/update/delete/reorder/publish/rollback/section-toggle/media action records an audit event.

## Standardized error model

All errors share an envelope:

```jsonc
{ "error": { "code": "CONFLICT", "message": "…", "details"?: { … } } }
```

| Status | code | When |
|--------|------|------|
| 400 | `BAD_REQUEST` | Malformed request |
| 401 | `UNAUTHENTICATED` | Missing/expired/revoked session, disabled account |
| 403 | `FORBIDDEN` / `CSRF` | CSRF failure or not permitted |
| 404 | `NOT_FOUND` | Unknown id |
| 409 | `CONFLICT` | Stale `version` (optimistic concurrency) or reference-protected delete; `details` includes the current `version` |
| 422 | `VALIDATION` | Field/publish validation failed; `details` lists field/section problems |
| 429 | `RATE_LIMITED` | Login throttling |

## Security & verification hooks

- All write routes require an authenticated session + valid CSRF token; unauthenticated writes → `401`
  (SC-010).
- The public endpoint never exposes draft/disabled/admin-only data (cross-checked against
  `content-model.md` INV-8).
- Contract tests assert paths, request/response shapes, the error model, `409` on stale writes, `422`
  on invalid content, `401` on unauthenticated writes, and reference-aware media deletion.
