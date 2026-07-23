// @vyvy/content-types — shared runtime schema + types for the VyVy Order Korea CMS.
//
// The Zod schemas are the SOURCE OF TRUTH for the public `GET /public/content`
// response (one page release). Types are inferred from them so the web client,
// API contract tests, and section rendering cannot drift. Matches
// specs/001-landing-page/data-model.md and contracts/content-model.md.
//
// PUBLIC shapes only — admin/moderation fields (e.g. review `approved`,
// `publishState`, `seedKey`, versioning, Mongo bookkeeping) are NOT part of this
// response. Every object schema is STRICT: unknown/leaked fields FAIL validation
// instead of being silently stripped (R2-P2-01).
//
// Safety (R2-P1-02): required strings are trimmed non-empty; contact handles are
// validated per channel type; link hrefs allow only https/http, site-relative
// paths, or in-page anchors — `javascript:`/`data:` and friends are rejected at
// this shared contract boundary before any value reaches clickable UI.

import { z } from "zod"

/** Trimmed, non-empty required string — whitespace-only values are rejected. */
const nonEmpty = z.string().trim().min(1)

export const contactChannelTypeSchema = z.enum([
  "zalo",
  "kakao",
  "messenger",
  "phone",
  "email",
  "social",
])
export type ContactChannelType = z.infer<typeof contactChannelTypeSchema>

// ---------------------------------------------------------------------------
// URL policy (R3-P1-01): context-specific validators built on the standards-
// compliant URL parser — NOT prefix regexes. Each field gets its own policy;
// no single permissive schema is reused across fields with different semantics.
// ---------------------------------------------------------------------------

const hasControlChars = (v: string): boolean =>
  // eslint-disable-next-line no-control-regex -- intentional: reject control chars in URLs
  /[\u0000-\u001f\u007f]/.test(v)

/** Absolute http(s) URL: parses via new URL(), http/https, non-empty hostname, no credentials. */
export function isValidAbsoluteHttpUrl(
  v: string,
  opts: { httpsOnly?: boolean } = {},
): boolean {
  if (hasControlChars(v) || /\s/.test(v)) return false
  let u: URL
  try {
    u = new URL(v)
  } catch {
    return false
  }
  const protocolOk = opts.httpsOnly
    ? u.protocol === "https:"
    : u.protocol === "http:" || u.protocol === "https:"
  if (!protocolOk) return false
  if (!u.hostname) return false // rejects "https:///" and friends
  if (u.username || u.password) return false
  return true
}

/**
 * Site-relative path: exactly one leading "/", no "//" (protocol-relative), no
 * backslashes, no control chars — and resolving against a base origin MUST stay
 * on that origin (rejects "/\\evil.example", which browsers resolve off-origin).
 */
export function isSafeRelativePath(v: string): boolean {
  if (hasControlChars(v) || /\s/.test(v)) return false
  if (!v.startsWith("/")) return false
  if (v.startsWith("//")) return false
  if (v.includes("\\")) return false
  const BASE = "https://relative-check.invalid"
  try {
    const resolved = new URL(v, BASE)
    if (resolved.origin !== BASE) return false
  } catch {
    return false
  }
  return true
}

/** In-page anchor: only the documented `#id` format. */
export function isValidAnchor(v: string): boolean {
  return /^#[A-Za-z0-9_-]+$/.test(v)
}

/** ImageRef.src: absolute http(s) URL or safe site-relative path; never an anchor. */
const imageSrc = nonEmpty.refine(
  (v) => isValidAbsoluteHttpUrl(v) || isSafeRelativePath(v),
  { message: "image src must be a valid http(s) URL or a safe site-relative path" },
)

/** FooterLink.href: absolute http(s) URL, safe site-relative path, or in-page anchor. */
const footerHref = nonEmpty.refine(
  (v) => isValidAbsoluteHttpUrl(v) || isSafeRelativePath(v) || isValidAnchor(v),
  { message: "href must be a valid http(s) URL, a safe site-relative path, or an in-page anchor" },
)

/** Seo.canonical: valid absolute http(s) URL only — never an anchor or relative path. */
const canonicalUrl = nonEmpty.refine((v) => isValidAbsoluteHttpUrl(v), {
  message: "canonical must be a valid absolute http(s) URL",
})

/** Social profile handle: valid absolute https URL only. */
const httpsUrl = nonEmpty.refine(
  (v) => isValidAbsoluteHttpUrl(v, { httpsOnly: true }),
  { message: "social handle must be a valid absolute https:// URL" },
)

/** Anchor-CTA target: an approved in-page anchor or a safe site-relative path. */
const anchorTarget = nonEmpty.refine(
  (v) => isValidAnchor(v) || isSafeRelativePath(v),
  { message: "anchor target must be an in-page anchor (#id) or a safe site-relative path" },
)

/** Phone: optional +, 6–15 digits after removing spaces/dots/dashes/parens. */
const phoneHandle = nonEmpty.refine(
  (v) => /^\+?\d{6,15}$/.test(v.replace(/[\s().-]/g, "")),
  { message: "phone handle must be a valid phone number (6–15 digits, optional +)" },
)

/** Zalo: phone number or OA id. Kakao: channel public id. Messenger: Facebook username or Page ID. */
const zaloHandle = nonEmpty.refine((v) => /^[A-Za-z0-9._-]{2,64}$/.test(v), {
  message: "zalo handle must be a phone number or OA id (2–64 chars: letters, digits, . _ -)",
})
const kakaoHandle = nonEmpty.refine((v) => /^[A-Za-z0-9._-]{2,64}$/.test(v), {
  message: "kakao handle must be a channel id (2–64 chars: letters, digits, . _ -)",
})
const messengerHandle = nonEmpty.refine((v) => /^[A-Za-z0-9._-]{2,64}$/.test(v), {
  message: "messenger handle must be a Facebook username or Page ID (2–64 chars: letters, digits, . _ -)",
})
const emailHandle = z.string().trim().email({ message: "email handle must be a valid address" })

export const imageRefSchema = z
  .object({
    src: imageSrc,
    alt: nonEmpty,
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
  })
  .strict()
export type ImageRef = z.infer<typeof imageRefSchema>

/**
 * CTA reference — discriminated by `channel` (R3-P1-01):
 *  - `channel: "anchor"` REQUIRES a `target` restricted to an in-page anchor or
 *    a safe site-relative path (never an arbitrary URL/scheme).
 *  - contact-channel CTAs (zalo/kakao/messenger/phone/email/social) PROHIBIT `target`
 *    entirely — the destination is always derived from the contact channel.
 */
const anchorCtaSchema = z
  .object({
    label: nonEmpty,
    channel: z.literal("anchor"),
    target: anchorTarget,
  })
  .strict()

const channelCtaSchema = z
  .object({
    label: nonEmpty,
    channel: contactChannelTypeSchema,
  })
  .strict()

export const ctaRefSchema = z.discriminatedUnion("channel", [
  anchorCtaSchema,
  channelCtaSchema.extend({ channel: z.literal("zalo") }).strict(),
  channelCtaSchema.extend({ channel: z.literal("kakao") }).strict(),
  channelCtaSchema.extend({ channel: z.literal("messenger") }).strict(),
  channelCtaSchema.extend({ channel: z.literal("phone") }).strict(),
  channelCtaSchema.extend({ channel: z.literal("email") }).strict(),
  channelCtaSchema.extend({ channel: z.literal("social") }).strict(),
])
export type CtaRef = z.infer<typeof ctaRefSchema>

export const brandSchema = z
  .object({
    name: nonEmpty,
    slogan: nonEmpty,
    tagline: z.string().optional(),
    logo: imageRefSchema.optional(),
  })
  .strict()
export type Brand = z.infer<typeof brandSchema>

export const heroSchema = z
  .object({
    headline: nonEmpty,
    subheadline: nonEmpty,
    primaryCta: ctaRefSchema,
    secondaryCta: ctaRefSchema.optional(),
    media: imageRefSchema.optional(),
  })
  .strict()
export type Hero = z.infer<typeof heroSchema>

export const serviceOfferingSchema = z
  .object({
    id: nonEmpty,
    title: nonEmpty,
    description: nonEmpty,
    icon: nonEmpty,
  })
  .strict()
export type ServiceOffering = z.infer<typeof serviceOfferingSchema>

export const trustPointSchema = z
  .object({
    id: nonEmpty,
    title: nonEmpty,
    description: nonEmpty,
    icon: nonEmpty,
  })
  .strict()
export type TrustPoint = z.infer<typeof trustPointSchema>

export const processStepSchema = z
  .object({
    id: nonEmpty,
    order: z.number().int().nonnegative(),
    title: nonEmpty,
    description: nonEmpty,
    icon: z.string().optional(),
  })
  .strict()
export type ProcessStep = z.infer<typeof processStepSchema>

export const productCategorySchema = z
  .object({
    id: nonEmpty,
    name: nonEmpty,
    image: imageRefSchema,
    blurb: z.string().optional(),
  })
  .strict()
export type ProductCategory = z.infer<typeof productCategorySchema>

/** PUBLIC review shape — no `approved`/moderation field (P2-03). */
export const customerReviewSchema = z
  .object({
    id: nonEmpty,
    name: nonEmpty,
    text: nonEmpty,
    rating: z.number().int().min(1).max(5).optional(),
    location: z.string().optional(),
    avatar: imageRefSchema.optional(),
  })
  .strict()
export type CustomerReview = z.infer<typeof customerReviewSchema>

export const faqItemSchema = z
  .object({
    id: nonEmpty,
    order: z.number().int().nonnegative(),
    question: nonEmpty,
    answer: nonEmpty,
  })
  .strict()
export type FaqItem = z.infer<typeof faqItemSchema>

/**
 * Public contact channel. NOTE: no `href` — the web app always derives the link
 * from `type` + `handle` via its contact builder (R2-P1-02). Handles are
 * validated per channel type below.
 */
export const contactChannelSchema = z
  .object({
    type: contactChannelTypeSchema,
    label: nonEmpty,
    handle: nonEmpty,
    icon: nonEmpty,
    external: z.boolean(),
  })
  .strict()
  .superRefine((c, ctx) => {
    const check = (schema: z.ZodTypeAny): void => {
      const r = schema.safeParse(c.handle)
      if (!r.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: r.error.issues[0]?.message ?? `invalid ${c.type} handle`,
          path: ["handle"],
        })
      }
    }
    switch (c.type) {
      case "zalo":
        check(zaloHandle)
        break
      case "kakao":
        check(kakaoHandle)
        break
      case "messenger":
        check(messengerHandle)
        break
      case "phone":
        check(phoneHandle)
        break
      case "email":
        check(emailHandle)
        break
      case "social":
        check(httpsUrl)
        break
    }
  })
export type ContactChannel = z.infer<typeof contactChannelSchema>

export const contactCTASchema = z
  .object({
    headline: nonEmpty,
    subtext: z.string().optional(),
    channels: z.array(ctaRefSchema).min(1),
  })
  .strict()
export type ContactCTA = z.infer<typeof contactCTASchema>

export const footerLinkSchema = z
  .object({ label: nonEmpty, href: footerHref })
  .strict()
export type FooterLink = z.infer<typeof footerLinkSchema>

export const footerSchema = z
  .object({
    contactSummary: nonEmpty,
    links: z.array(footerLinkSchema),
    socials: z.array(contactChannelSchema).optional(),
    copyright: nonEmpty,
  })
  .strict()
export type Footer = z.infer<typeof footerSchema>

export const seoSchema = z
  .object({
    title: nonEmpty,
    description: nonEmpty,
    canonical: canonicalUrl.optional(),
    ogImage: imageRefSchema.optional(),
    ogFields: z.record(z.string()).optional(),
    twitterFields: z.record(z.string()).optional(),
  })
  .strict()
export type Seo = z.infer<typeof seoSchema>

export const releaseMetaSchema = z
  .object({
    releaseNumber: z.number().int().nonnegative(),
    publishedAt: z.string().datetime(),
  })
  .strict()
export type ReleaseMeta = z.infer<typeof releaseMetaSchema>

const hasChannel = (arr: { type: ContactChannelType }[], t: ContactChannelType) =>
  arr.some((c) => c.type === t)

/**
 * The public page content — one internally-consistent release. Optional-section
 * keys are present only when the section is enabled AND published; required
 * sections are always present. `contact` MUST include a Zalo and a Kakao channel,
 * and the CTA MUST reference both (FR-010, contract INV-6). Each channel type may
 * appear at most once in `contact`, so a `CtaRef` resolves deterministically
 * (contract INV-10).
 */
export const siteContentSchema = z
  .object({
    meta: releaseMetaSchema,
    brand: brandSchema,
    hero: heroSchema,
    services: z.array(serviceOfferingSchema).optional(),
    trustPoints: z.array(trustPointSchema).optional(),
    processSteps: z.array(processStepSchema).optional(),
    categories: z.array(productCategorySchema).optional(),
    reviews: z.array(customerReviewSchema).optional(),
    faq: z.array(faqItemSchema).optional(),
    cta: contactCTASchema,
    footer: footerSchema,
    contact: z.array(contactChannelSchema),
    seo: seoSchema,
  })
  .strict()
  .superRefine((c, ctx) => {
    if (!hasChannel(c.contact, "zalo") || !hasChannel(c.contact, "kakao")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "contact must include at least one zalo and one kakao channel",
        path: ["contact"],
      })
    }

    // --- Contact channel identity (R5-P1-01) ---
    // A `CtaRef` addresses a contact destination by channel TYPE alone, so a type
    // may appear at most once in `contact`. Without this, two same-type records
    // would make the CTA target depend on array order (INV-10). Duplicates are
    // reported on every repeat occurrence at `contact.<index>.type`.
    const seenTypes = new Map<ContactChannelType, number>()
    c.contact.forEach((ch, i) => {
      const first = seenTypes.get(ch.type)
      if (first === undefined) {
        seenTypes.set(ch.type, i)
      } else {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate contact channel type "${ch.type}" (already configured at contact[${first}]); each channel type may appear at most once`,
          path: ["contact", i, "type"],
        })
      }
    })

    // --- Cross-field CTA reference integrity (R4-P1-01) ---
    // Every non-anchor CTA must reference a channel type that actually exists in
    // the configured `contact` list, so a structurally valid page can never ship
    // an unresolved/dead conversion action (FR-004, FR-010).
    const configured = new Set(c.contact.map((ch) => ch.type))

    // Hero PRIMARY CTA: must be a functional CONTACT CTA (never an anchor), and
    // its channel must be configured (FR-004: primary contact call-to-action).
    if (c.hero.primaryCta.channel === "anchor") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "hero primary CTA must be a contact-channel CTA, not an anchor (FR-004)",
        path: ["hero", "primaryCta", "channel"],
      })
    } else if (!configured.has(c.hero.primaryCta.channel)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `hero primary CTA references channel "${c.hero.primaryCta.channel}" which is not configured in contact`,
        path: ["hero", "primaryCta", "channel"],
      })
    }

    // Hero SECONDARY CTA: a valid anchor is allowed; a contact-channel CTA must
    // reference a configured channel.
    if (
      c.hero.secondaryCta &&
      c.hero.secondaryCta.channel !== "anchor" &&
      !configured.has(c.hero.secondaryCta.channel)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `hero secondary CTA references channel "${c.hero.secondaryCta.channel}" which is not configured in contact`,
        path: ["hero", "secondaryCta", "channel"],
      })
    }

    // Dedicated Contact CTA section: contact-only (no anchors — FR-010), every
    // entry must reference a configured channel, and both Zalo and Kakao must be
    // referenced.
    c.cta.channels.forEach((r, i) => {
      if (r.channel === "anchor") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "the dedicated contact CTA section is contact-only; anchor entries are not allowed (FR-010)",
          path: ["cta", "channels", i, "channel"],
        })
      } else if (!configured.has(r.channel)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `cta.channels[${i}] references channel "${r.channel}" which is not configured in contact`,
          path: ["cta", "channels", i, "channel"],
        })
      }
    })

    const ctaChannels = c.cta.channels.map((r) => r.channel)
    if (!ctaChannels.includes("zalo") || !ctaChannels.includes("kakao")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "cta.channels must reference both zalo and kakao",
        path: ["cta", "channels"],
      })
    }
  })

export type SiteContent = z.infer<typeof siteContentSchema>

/** The release content without derived `meta` (what the CMS stores per release). */
export type SiteContentBody = Omit<SiteContent, "meta">

/** Parse + validate an unknown value as a full public SiteContent (throws on failure). */
export function parseSiteContent(data: unknown): SiteContent {
  return siteContentSchema.parse(data)
}

/** Safe-parse variant returning the Zod result. */
export function safeParseSiteContent(data: unknown) {
  return siteContentSchema.safeParse(data)
}
