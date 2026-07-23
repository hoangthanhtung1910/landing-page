import { test } from "node:test"
import assert from "node:assert/strict"
import type { ContactChannel } from "@vyvy/content-types"
import type { CtaRef } from "@vyvy/content-types"
import { buildHref, isResolvable, externalLinkAttrs, resolveCta } from "./contact"

const ch = (over: Partial<ContactChannel>): ContactChannel => ({
  type: "zalo",
  label: "Zalo",
  handle: "0900000000",
  icon: "message-circle",
  external: true,
  ...over,
})

test("zalo builds https zalo.me deep link", () => {
  assert.equal(buildHref(ch({ type: "zalo", handle: "0900000000" })), "https://zalo.me/0900000000")
})

test("kakao builds https pf.kakao.com channel link", () => {
  assert.equal(buildHref(ch({ type: "kakao", handle: "vyvyorder" })), "https://pf.kakao.com/vyvyorder")
})

test("phone builds tel: link without spaces", () => {
  assert.equal(buildHref(ch({ type: "phone", handle: "+84 900 000 000" })), "tel:+84900000000")
})

test("email builds mailto: link", () => {
  assert.equal(buildHref(ch({ type: "email", handle: "hi@vyvy.vn" })), "mailto:hi@vyvy.vn")
})

test("social returns a valid https URL as-is", () => {
  assert.equal(buildHref(ch({ type: "social", handle: "https://facebook.com/vyvy" })), "https://facebook.com/vyvy")
})

test("social with an unsafe scheme degrades to the safe placeholder", () => {
  assert.equal(buildHref(ch({ type: "social", handle: "javascript:alert(1)" })), "#")
  assert.equal(buildHref(ch({ type: "social", handle: "data:text/html,x" })), "#")
})

test("social is https-only (parsed): http, credentials, and malformed degrade to placeholder", () => {
  assert.equal(buildHref(ch({ type: "social", handle: "http://facebook.com/vyvy" })), "#")
  assert.equal(buildHref(ch({ type: "social", handle: "https://user:pass@host/" })), "#")
  assert.equal(buildHref(ch({ type: "social", handle: "https:///" })), "#")
})

test("missing handle yields safe placeholder, not a dead link (R-3)", () => {
  assert.equal(isResolvable(ch({ handle: "" })), false)
  assert.equal(buildHref(ch({ handle: "   " })), "#")
})

test("external channels get target=_blank + rel=noopener (R-2)", () => {
  assert.deepEqual(externalLinkAttrs(ch({ external: true })), {
    target: "_blank",
    rel: "noopener noreferrer",
  })
  assert.deepEqual(externalLinkAttrs(ch({ external: false })), {})
})

// --- resolveCta: CtaRef → clickable destination (T019/T020) ---

const contacts = [
  ch({ type: "zalo", handle: "0900000000", external: true }),
  ch({ type: "kakao", handle: "vyvyorder", external: true }),
  ch({ type: "phone", handle: "+84900000000", external: false }),
]

test("resolveCta: contact-channel ref resolves to the matching channel's href", () => {
  const ref: CtaRef = { label: "Zalo", channel: "zalo" }
  assert.deepEqual(resolveCta(ref, contacts), {
    href: "https://zalo.me/0900000000",
    external: true,
    channel: contacts[0],
  })
})

test("resolveCta: non-external channel (phone) is not marked external", () => {
  const ref: CtaRef = { label: "Gọi", channel: "phone" }
  const r = resolveCta(ref, contacts)
  assert.equal(r.href, "tel:+84900000000")
  assert.equal(r.external, false)
})

test("resolveCta: anchor ref uses its target and is never external", () => {
  const ref: CtaRef = { label: "Quy trình", channel: "anchor", target: "#quy-trinh" }
  assert.deepEqual(resolveCta(ref, contacts), { href: "#quy-trinh", external: false })
})

test("resolveCta: unresolved channel degrades to a safe placeholder", () => {
  const ref: CtaRef = { label: "Email", channel: "email" }
  assert.deepEqual(resolveCta(ref, contacts), { href: "#", external: false })
})
