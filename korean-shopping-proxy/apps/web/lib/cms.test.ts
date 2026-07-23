import { test } from "node:test"
import assert from "node:assert/strict"
import { type SiteContent, safeParseSiteContent } from "@vyvy/content-types"
import { parseContentOrThrow, resolveTimeoutMs } from "./cms"

function validContent(): SiteContent {
  return {
    meta: { releaseNumber: 1, publishedAt: "2026-07-17T06:34:42.980Z" },
    brand: { name: "VyVy", slogan: "Slogan", logo: { src: "/l.png", alt: "logo" } },
    hero: {
      headline: "Headline",
      subheadline: "Sub",
      primaryCta: { label: "Zalo", channel: "zalo" },
    },
    services: [{ id: "s1", title: "T", description: "D", icon: "i" }],
    processSteps: [{ id: "p1", order: 1, title: "T", description: "D" }],
    faq: [{ id: "f1", order: 1, question: "Q", answer: "A" }],
    cta: {
      headline: "CTA",
      channels: [
        { label: "Zalo", channel: "zalo" },
        { label: "Kakao", channel: "kakao" },
      ],
    },
    footer: { contactSummary: "S", links: [], copyright: "©" },
    contact: [
      { type: "zalo", label: "Zalo", handle: "0900000000", icon: "i", external: true },
      { type: "kakao", label: "Kakao", handle: "vyvyorder", icon: "i", external: true },
    ],
    seo: { title: "Title", description: "Desc" },
  }
}

test("accepts a fully valid response", () => {
  assert.doesNotThrow(() => parseContentOrThrow(validContent()))
})

test("rejects empty nested objects (brand/hero/cta empty)", () => {
  assert.throws(() =>
    parseContentOrThrow({
      meta: { releaseNumber: 1, publishedAt: "2026-07-17T06:34:42.980Z" },
      brand: {},
      hero: {},
      cta: {},
      footer: {},
      contact: [],
      seo: {},
    }),
  )
})

test("rejects empty contact list (missing zalo/kakao)", () => {
  const c = validContent()
  c.contact = []
  assert.throws(() => parseContentOrThrow(c), /zalo.*kakao|kakao|contact/i)
})

test("rejects contact missing kakao", () => {
  const c = validContent()
  c.contact = c.contact.filter((x) => x.type !== "kakao")
  assert.throws(() => parseContentOrThrow(c))
})

test("rejects cta not referencing both channels", () => {
  const c = validContent()
  c.cta.channels = [{ label: "Zalo", channel: "zalo" }]
  assert.throws(() => parseContentOrThrow(c))
})

test("rejects missing nested field (hero.headline)", () => {
  const c = validContent() as unknown as Record<string, unknown>
  ;(c.hero as Record<string, unknown>).headline = ""
  assert.throws(() => parseContentOrThrow(c))
})

test("rejects invalid meta (missing releaseNumber / bad publishedAt)", () => {
  const c = validContent()
  ;(c.meta as unknown as Record<string, unknown>).publishedAt = "not-a-date"
  assert.throws(() => parseContentOrThrow(c))
})

test("rejects malformed optional section (processStep without order)", () => {
  const c = validContent() as unknown as Record<string, unknown>
  ;(c.processSteps as Record<string, unknown>[])[0] = { id: "p1", title: "T", description: "D" }
  assert.throws(() => parseContentOrThrow(c))
})

test("rejects image with empty alt", () => {
  const c = validContent()
  c.brand.logo = { src: "/l.png", alt: "" }
  assert.throws(() => parseContentOrThrow(c))
})

test("rejects unknown/extra top-level keys (strict)", () => {
  const c = validContent() as unknown as Record<string, unknown>
  c.reviewsDraft = [{ secret: true }]
  assert.throws(() => parseContentOrThrow(c))
})

test("rejects non-object / null", () => {
  assert.throws(() => parseContentOrThrow(null))
  assert.throws(() => parseContentOrThrow("nope"))
})

// --- R2-P1-02: whitespace + unsafe schemes ---

test("rejects whitespace-only required fields", () => {
  const c = validContent()
  c.hero.headline = "   "
  assert.throws(() => parseContentOrThrow(c))
  const c2 = validContent()
  c2.brand.name = "\t\n"
  assert.throws(() => parseContentOrThrow(c2))
})

test("rejects javascript: social handle", () => {
  const c = validContent()
  c.contact.push({
    type: "social",
    label: "X",
    handle: "javascript:alert(1)",
    icon: "i",
    external: true,
  })
  assert.throws(() => parseContentOrThrow(c))
})

test("accepts a valid https social handle", () => {
  const c = validContent()
  c.contact.push({
    type: "social",
    label: "FB",
    handle: "https://facebook.com/vyvy",
    icon: "i",
    external: true,
  })
  assert.doesNotThrow(() => parseContentOrThrow(c))
})

test("rejects javascript:/data: footer links; accepts https, relative, anchor", () => {
  const bad1 = validContent()
  bad1.footer.links = [{ label: "x", href: "javascript:alert(1)" }]
  assert.throws(() => parseContentOrThrow(bad1))

  const bad2 = validContent()
  bad2.footer.links = [{ label: "x", href: "data:text/html,x" }]
  assert.throws(() => parseContentOrThrow(bad2))

  const ok = validContent()
  ok.footer.links = [
    { label: "a", href: "https://example.com/terms" },
    { label: "b", href: "/privacy" },
    { label: "c", href: "#lien-he" },
  ]
  assert.doesNotThrow(() => parseContentOrThrow(ok))
})

test("rejects malformed email and phone handles", () => {
  const c = validContent()
  c.contact.push({ type: "email", label: "Mail", handle: "not-an-email", icon: "i", external: false })
  assert.throws(() => parseContentOrThrow(c))

  const c2 = validContent()
  c2.contact.push({ type: "phone", label: "Tel", handle: "abc-not-phone", icon: "i", external: false })
  assert.throws(() => parseContentOrThrow(c2))
})

// --- R3-P1-01: URL/CTA policy — parser-based, context-specific ---

test("rejects Codex's exact r3 reproduction (js anchor target + backslash path + https:///)", () => {
  const c = validContent() as unknown as {
    hero: { primaryCta: Record<string, unknown> }
    footer: { links: Record<string, unknown>[] }
    seo: Record<string, unknown>
  }
  c.hero.primaryCta = { label: "x", channel: "anchor", target: "javascript:alert(1)" }
  c.footer.links = [{ label: "Unexpected external redirect", href: "/\\evil.example" }]
  c.seo.canonical = "https:///"
  assert.throws(() => parseContentOrThrow(c))
})

test("rejects prefix-correct but syntactically invalid absolute URLs (https:///)", () => {
  const c = validContent()
  c.seo.canonical = "https:///"
  assert.throws(() => parseContentOrThrow(c))
})

test("rejects javascript:/data: CTA targets on anchor CTAs", () => {
  const c1 = validContent()
  c1.hero.secondaryCta = { label: "x", channel: "anchor", target: "javascript:alert(1)" } as never
  assert.throws(() => parseContentOrThrow(c1))
  const c2 = validContent()
  c2.hero.secondaryCta = { label: "x", channel: "anchor", target: "data:text/html,x" } as never
  assert.throws(() => parseContentOrThrow(c2))
})

test("rejects site-relative values containing backslashes (/\\evil.example)", () => {
  const c = validContent()
  c.footer.links = [{ label: "x", href: "/\\evil.example" }]
  assert.throws(() => parseContentOrThrow(c))
})

test("rejects protocol-relative URLs (//host)", () => {
  const c = validContent()
  c.footer.links = [{ label: "x", href: "//evil.example/path" }]
  assert.throws(() => parseContentOrThrow(c))
})

test("rejects absolute URLs containing credentials", () => {
  const c = validContent()
  c.footer.links = [{ label: "x", href: "https://user:pass@example.com/" }]
  assert.throws(() => parseContentOrThrow(c))
})

test("anchor CTA requires a target; invalid anchor syntax is rejected", () => {
  const c1 = validContent()
  c1.hero.secondaryCta = { label: "x", channel: "anchor" } as never // missing target
  assert.throws(() => parseContentOrThrow(c1))
  const c2 = validContent()
  c2.hero.secondaryCta = { label: "x", channel: "anchor", target: "#bad anchor!" } as never
  assert.throws(() => parseContentOrThrow(c2))
})

test("contact-channel CTAs must not carry a target", () => {
  const c = validContent()
  c.cta.channels = [
    { label: "Zalo", channel: "zalo", target: "https://evil.example" } as never,
    { label: "Kakao", channel: "kakao" },
  ]
  assert.throws(() => parseContentOrThrow(c))
})

test("image src must not be an anchor; canonical must not be an anchor or relative", () => {
  const c1 = validContent()
  c1.brand.logo = { src: "#logo", alt: "logo" }
  assert.throws(() => parseContentOrThrow(c1))
  const c2 = validContent()
  c2.seo.canonical = "#top"
  assert.throws(() => parseContentOrThrow(c2))
  const c3 = validContent()
  c3.seo.canonical = "/vi/home"
  assert.throws(() => parseContentOrThrow(c3))
})

test("accepts valid https canonical, anchor CTA, and relative image/footer paths", () => {
  const c = validContent()
  c.seo.canonical = "https://vyvy.example/"
  c.hero.secondaryCta = { label: "Xem quy trình", channel: "anchor", target: "#quy-trinh" }
  c.brand.logo = { src: "/images/logo.png", alt: "logo" }
  c.footer.links = [
    { label: "a", href: "https://example.com/terms" },
    { label: "b", href: "/privacy" },
    { label: "c", href: "#lien-he" },
  ]
  assert.doesNotThrow(() => parseContentOrThrow(c))
})

// --- R4-P1-01: cross-field CTA-reference integrity ---

test("rejects hero primary CTA as anchor (must be a contact CTA — FR-004)", () => {
  const c = validContent()
  c.hero.primaryCta = { label: "About", channel: "anchor", target: "#about" }
  assert.throws(() => parseContentOrThrow(c), /primary CTA must be a contact-channel/)
})

test("rejects hero primary email CTA when no email contact is configured (Codex repro)", () => {
  const c = validContent()
  c.hero.primaryCta = { label: "Email us", channel: "email" }
  assert.throws(() => parseContentOrThrow(c), /not configured in contact/)
})

test("rejects hero secondary phone CTA when no phone contact exists", () => {
  const c = validContent()
  c.hero.secondaryCta = { label: "Call", channel: "phone" }
  assert.throws(() => parseContentOrThrow(c), /secondary CTA references channel "phone"/)
})

test("rejects dedicated CTA social entry when no social contact exists", () => {
  const c = validContent()
  c.cta.channels = [
    { label: "Zalo", channel: "zalo" },
    { label: "Kakao", channel: "kakao" },
    { label: "FB", channel: "social" },
  ]
  assert.throws(() => parseContentOrThrow(c), /cta\.channels\[2\] references channel "social"/)
})

test("rejects anchor entries in the dedicated contact-only CTA section", () => {
  const c = validContent()
  c.cta.channels = [
    { label: "Zalo", channel: "zalo" },
    { label: "Kakao", channel: "kakao" },
    { label: "Top", channel: "anchor", target: "#top" },
  ]
  assert.throws(() => parseContentOrThrow(c), /contact-only; anchor entries are not allowed/)
})

test("accepts hero primary zalo/kakao CTA with matching configured contact", () => {
  const c1 = validContent() // primary = zalo, zalo configured
  assert.doesNotThrow(() => parseContentOrThrow(c1))
  const c2 = validContent()
  c2.hero.primaryCta = { label: "Kakao", channel: "kakao" }
  assert.doesNotThrow(() => parseContentOrThrow(c2))
})

test("accepts hero secondary anchor CTA and configured-contact CTAs", () => {
  const c1 = validContent()
  c1.hero.secondaryCta = { label: "Quy trình", channel: "anchor", target: "#quy-trinh" }
  assert.doesNotThrow(() => parseContentOrThrow(c1))

  const c2 = validContent()
  c2.contact.push({ type: "phone", label: "Tel", handle: "+84900000000", icon: "i", external: false })
  c2.hero.secondaryCta = { label: "Call", channel: "phone" }
  assert.doesNotThrow(() => parseContentOrThrow(c2))

  const c3 = validContent()
  c3.contact.push({ type: "email", label: "Mail", handle: "hi@vyvy.vn", icon: "i", external: false })
  c3.hero.secondaryCta = { label: "Email", channel: "email" }
  assert.doesNotThrow(() => parseContentOrThrow(c3))

  const c4 = validContent()
  c4.contact.push({ type: "social", label: "FB", handle: "https://facebook.com/vyvy", icon: "i", external: true })
  c4.hero.secondaryCta = { label: "FB", channel: "social" }
  assert.doesNotThrow(() => parseContentOrThrow(c4))
})

// --- R5-P1-01: contact channel type uniqueness (deterministic CtaRef identity) ---

test("rejects two zalo contacts at the duplicate's contact.<index>.type path", () => {
  const c = validContent()
  c.contact.push({ type: "zalo", label: "Zalo 2", handle: "0911111111", icon: "i", external: true })
  const r = safeParseSiteContent(c)
  assert.equal(r.success, false)
  assert.ok(
    r.error!.issues.some(
      (i) =>
        i.path.join(".") === "contact.2.type" && /duplicate contact channel type "zalo"/.test(i.message),
    ),
    "expected a duplicate-zalo issue at contact.2.type",
  )
})

test("rejects two kakao contacts at the duplicate's contact.<index>.type path", () => {
  const c = validContent()
  c.contact.push({ type: "kakao", label: "Kakao 2", handle: "vyvyorder2", icon: "i", external: true })
  const r = safeParseSiteContent(c)
  assert.equal(r.success, false)
  assert.ok(
    r.error!.issues.some(
      (i) =>
        i.path.join(".") === "contact.2.type" && /duplicate contact channel type "kakao"/.test(i.message),
    ),
    "expected a duplicate-kakao issue at contact.2.type",
  )
})

test("rejects a duplicated non-required type (two social contacts)", () => {
  const c = validContent()
  c.contact.push({ type: "social", label: "FB", handle: "https://facebook.com/vyvy", icon: "i", external: true })
  c.contact.push({ type: "social", label: "IG", handle: "https://instagram.com/vyvy", icon: "i", external: true })
  const r = safeParseSiteContent(c)
  assert.equal(r.success, false)
  assert.ok(
    r.error!.issues.some((i) => i.path.join(".") === "contact.3.type"),
    "expected the duplicate-social issue at contact.3.type",
  )
})

test("accepts one contact record per configured channel type", () => {
  const c = validContent()
  c.contact.push({ type: "phone", label: "Tel", handle: "+84900000000", icon: "i", external: false })
  c.contact.push({ type: "email", label: "Mail", handle: "hi@vyvy.vn", icon: "i", external: false })
  c.contact.push({ type: "social", label: "FB", handle: "https://facebook.com/vyvy", icon: "i", external: true })
  assert.doesNotThrow(() => parseContentOrThrow(c))
})

// --- R2-P2-01: nested strictness — leaked admin fields must FAIL, not be stripped ---

test("rejects leaked nested admin fields (publishState/approved/seedKey/version)", () => {
  const c1 = validContent() as unknown as Record<string, Record<string, unknown>>
  c1.hero.publishState = "draft"
  assert.throws(() => parseContentOrThrow(c1))

  const c2 = validContent()
  ;(c2.contact[0] as unknown as Record<string, unknown>).approved = true
  assert.throws(() => parseContentOrThrow(c2))

  const c3 = validContent()
  ;(c3.services![0] as unknown as Record<string, unknown>).seedKey = "service-1"
  assert.throws(() => parseContentOrThrow(c3))

  const c4 = validContent()
  ;(c4.faq![0] as unknown as Record<string, unknown>).version = 3
  assert.throws(() => parseContentOrThrow(c4))
})

// Timeout validation (P1-02)
test("resolveTimeoutMs: default when unset", () => {
  assert.equal(resolveTimeoutMs(undefined), 5000)
  assert.equal(resolveTimeoutMs(""), 5000)
})

test("resolveTimeoutMs: accepts a valid bounded value", () => {
  assert.equal(resolveTimeoutMs("3000"), 3000)
})

test("resolveTimeoutMs: rejects NaN, non-positive, and out-of-range", () => {
  assert.throws(() => resolveTimeoutMs("abc"))
  assert.throws(() => resolveTimeoutMs("0"))
  assert.throws(() => resolveTimeoutMs("-5"))
  assert.throws(() => resolveTimeoutMs("999999"))
})
