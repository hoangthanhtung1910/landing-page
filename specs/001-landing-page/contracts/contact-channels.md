# Contract: Contact Channels (Zalo / Kakao / Phone)

**Feature**: 001-landing-page | **Date**: 2026-07-14

Defines how contact destinations are configured and turned into working links with graceful fallback. Implemented in `lib/contact.ts`. Satisfies FR-010, FR-011, FR-012, FR-016.

## Channel configuration

The business supplies raw handles; the module builds resolved `href`s. All values are placeholders until real ones are provided (see spec Assumptions).

| type | Raw input (business supplies) | Resolved `href` | Fallback behavior |
|------|-------------------------------|-----------------|-------------------|
| `zalo` | phone number or Zalo OA id | `https://zalo.me/<handle>` | https URL opens Zalo app if installed, else Zalo web profile |
| `kakao` | Kakao channel public id | `https://pf.kakao.com/<handle>` | https URL opens KakaoTalk if installed, else Kakao web channel |
| `phone` | E.164 phone number | `tel:<number>` | Native dialer |
| `email` | email address | `mailto:<address>` | Native mail client |
| `social` | full URL | `<url>` as-is | Opens in browser |

**Rule R-1**: Only https channel URLs are used for Zalo/Kakao (never `zalo://`/`kakaotalk://` custom schemes), because https app-links self-degrade to a usable web page when the app is absent. (FR-011)

**Rule R-2**: All external channel links render with `target="_blank"` and `rel="noopener noreferrer"`.

**Rule R-3**: If a raw handle is missing/empty, the builder returns a safe placeholder `href="#"` and the button is visibly marked as "coming soon" rather than producing a broken/dead link. (edge case: no content yet)

## Link builder contract

```ts
// lib/contact.ts
function buildHref(channel: ContactChannel): string  // applies the table + R-1/R-3
function isResolvable(channel: ContactChannel): boolean // false when handle missing
```

- `buildHref` is pure and deterministic given a channel.
- The sticky `contact-bar.tsx` and every CTA button consume the SAME channel objects, so a single edit updates all touchpoints. (FR-016)

## Placement contract (FR-012)

- Zalo + Kakao actions appear in: Hero (§1, above fold), Contact CTA (§7), Footer (§8), site header (desktop), and a sticky bottom bar on mobile.
- The sticky mobile bar is present at every scroll position; therefore a contact action is always reachable without scrolling to the top. (FR-012, US1 acceptance #2)

## Verification hooks

- Manual: tap each channel on a device with/without the app → resolves to app or web fallback, never a dead link.
- Static: assert `buildHref` output matches the table for each type; assert `contact` includes ≥1 zalo and ≥1 kakao.
