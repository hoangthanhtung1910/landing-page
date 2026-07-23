import type { ContactChannel, CtaRef } from "@vyvy/content-types"

/**
 * Contact-link builder (T016B) — see specs/001-landing-page/contracts/contact-channels.md.
 * Only https channel URLs are used for Zalo/Kakao/Messenger (they self-degrade to
 * a web page when the app is absent); phone/email use native schemes. A missing
 * handle yields a safe "#" placeholder rather than a dead link (Rule R-3).
 */

const PLACEHOLDER_HREF = "#"

export function isResolvable(channel: Pick<ContactChannel, "handle">): boolean {
  return typeof channel.handle === "string" && channel.handle.trim().length > 0
}

export function buildHref(channel: ContactChannel): string {
  if (!isResolvable(channel)) return PLACEHOLDER_HREF
  const handle = channel.handle.trim()

  switch (channel.type) {
    case "zalo":
      return `https://zalo.me/${encodeURIComponent(handle)}`
    case "kakao":
      return `https://pf.kakao.com/${encodeURIComponent(handle)}`
    case "messenger":
      return `https://m.me/${encodeURIComponent(handle)}`
    case "phone":
      return `tel:${handle.replace(/\s+/g, "")}`
    case "email":
      return `mailto:${handle}`
    case "social": {
      // Defense-in-depth (matches the shared schema policy): only a PARSED
      // https URL with a hostname and no credentials passes through; anything
      // else (http, javascript:, data:, malformed) degrades to the placeholder.
      try {
        const u = new URL(handle)
        if (u.protocol === "https:" && u.hostname && !u.username && !u.password) {
          return handle
        }
      } catch {
        // fall through to placeholder
      }
      return PLACEHOLDER_HREF
    }
    default:
      return PLACEHOLDER_HREF
  }
}

/** Anchor attributes for external channel links (Rule R-2). */
export function externalLinkAttrs(channel: ContactChannel): {
  target?: string
  rel?: string
} {
  return channel.external
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {}
}

/** A CTA reference resolved to a clickable destination for rendering (T019/T020). */
export interface ResolvedCta {
  href: string
  /** true → render with target=_blank + rel=noopener (external contact channel). */
  external: boolean
  /** The referenced contact channel, or undefined for in-page anchor CTAs. */
  channel?: ContactChannel
}

/**
 * Turn a `CtaRef` into a clickable destination against the configured contact
 * list. Anchor CTAs use their in-page/site-relative `target`; contact-channel
 * CTAs resolve to the matching channel's built href. For schema-valid content the
 * lookup always succeeds — every non-anchor ref is guaranteed to reference a
 * configured channel and each type is unique (R4-P1-01 / INV-10). The missing
 * branch is a defensive placeholder that never fires on validated content.
 */
export function resolveCta(ref: CtaRef, contacts: ContactChannel[]): ResolvedCta {
  if (ref.channel === "anchor") {
    return { href: ref.target, external: false }
  }
  const channel = contacts.find((c) => c.type === ref.channel)
  if (!channel) return { href: "#", external: false }
  return { href: buildHref(channel), external: channel.external, channel }
}
