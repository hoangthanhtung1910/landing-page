# Contract: Contact Channels (Zalo / Kakao / Phone)

**Feature**: 001-landing-page | **Date**: 2026-07-14 (revised 2026-07-16 — sourced from CMS)

Defines how contact destinations are configured and turned into working links with graceful fallback.
Implemented in `apps/web/lib/contact.ts`. Satisfies FR-010, FR-011, FR-012, FR-016. Channel data is now
**CMS-managed contact content** (edited by admins via the admin API) rather than a static file; the
link-building rules below are unchanged.

## Channel configuration

The business supplies raw handles through the CMS; the module builds resolved `href`s. The resolved
`href` is a **derived, non-persisted view value** — it is NOT stored and NOT part of the public
`ContactChannel` schema (which has only `type`, `label`, `handle`, `icon`, `external`). Admin DTOs MUST
NOT persist an `href`. Seed/placeholder values are development-only and MUST be replaced with verified
real destinations before launch (FR-045); production must never ship placeholder contact links
(SC-017).

**Uniqueness (INV-10)**: within `content.contact` each channel `type` appears at most once, so a
`CtaRef` (which references a destination by `type` alone) resolves deterministically. Full-page
validation rejects a duplicated type at `contact.<index>.type`.

| type | Raw input (business supplies) | Resolved `href` | Fallback behavior |
|------|-------------------------------|-----------------|-------------------|
| `zalo` | phone number or Zalo OA id | `https://zalo.me/<handle>` | https URL opens Zalo app if installed, else Zalo web profile |
| `kakao` | Kakao channel public id | `https://pf.kakao.com/<handle>` | https URL opens KakaoTalk if installed, else Kakao web channel |
| `phone` | E.164 phone number | `tel:<number>` | Native dialer |
| `email` | email address | `mailto:<address>` | Native mail client |
| `social` | full URL | `<url>` as-is | Opens in browser |

**Rule R-1**: Only https channel URLs are used for Zalo/Kakao (never `zalo://`/`kakaotalk://` custom schemes), because https app-links self-degrade to a usable web page when the app is absent. (FR-011)

**Rule R-2**: All external channel links render with `target="_blank"` and `rel="noopener noreferrer"`.

**Rule R-3**: Published/public content never carries an empty or malformed handle — the shared public
schema requires every `handle` to be non-empty and valid for its channel `type`, and fail-closed
build/validation rejects anything else. `buildHref`'s missing-handle branch (returns a safe
placeholder `href="#"` and marks the button "coming soon") is a **defensive runtime guard** for
not-yet-configured/preview states, not a path that published data can reach. (edge case: no content yet)

## Link builder contract

```ts
// apps/web/lib/contact.ts
function buildHref(channel: ContactChannel): string  // applies the table + R-1/R-3
function isResolvable(channel: ContactChannel): boolean // false when handle missing
```

- `buildHref` is pure and deterministic given a channel; unit-tested (task T016B).
- The sticky `contact-bar.tsx` and every CTA button consume the SAME channel objects (from
  `content.contact`), so a single admin edit updates all touchpoints. (FR-016)

## Placement contract (FR-012)

- Zalo + Kakao actions appear in: Hero (§1, above fold), Contact CTA (§7), Footer (§8), site header,
  and a sticky bottom bar on mobile.
- A contact action is reachable from **every scroll position on all supported layouts**: a sticky
  bottom bar on mobile AND a sticky header or floating contact affordance on desktop (not solely a
  non-sticky header CTA). (FR-012, US1 acceptance #2)

## Verification hooks

- Manual: tap each channel on a device with/without the app → resolves to app or web fallback, never a dead link.
- Static: assert `buildHref` output matches the table for each type; assert `contact` includes ≥1 zalo and ≥1 kakao.
