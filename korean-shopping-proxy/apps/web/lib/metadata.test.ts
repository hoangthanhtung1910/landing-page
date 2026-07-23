import { test } from "node:test"
import assert from "node:assert/strict"
import { resolveMetadataBase } from "./metadata"

test("resolveMetadataBase: unset/empty throws — site origin is required (fail-closed)", () => {
  assert.throws(() => resolveMetadataBase(undefined), /Missing NEXT_PUBLIC_SITE_URL/)
  assert.throws(() => resolveMetadataBase(""), /Missing NEXT_PUBLIC_SITE_URL/)
  assert.throws(() => resolveMetadataBase("   "), /Missing NEXT_PUBLIC_SITE_URL/)
})

test("resolveMetadataBase: valid absolute URL resolves to a URL", () => {
  const u = resolveMetadataBase("https://vyvyorder.example.com")
  assert.ok(u instanceof URL)
  assert.equal(u!.origin, "https://vyvyorder.example.com")
})

test("resolveMetadataBase: trims surrounding whitespace", () => {
  const u = resolveMetadataBase("  https://vyvyorder.example.com/  ")
  assert.equal(u!.origin, "https://vyvyorder.example.com")
})

test("resolveMetadataBase: declared-but-invalid value throws (fail-closed)", () => {
  assert.throws(() => resolveMetadataBase("not-a-url"), /Invalid NEXT_PUBLIC_SITE_URL/)
})

test("resolveMetadataBase: non-http(s) scheme throws", () => {
  assert.throws(() => resolveMetadataBase("ftp://vyvyorder.example.com"), /must be an http\(s\) URL/)
})

test("resolveMetadataBase: absolute URL without a hostname throws", () => {
  assert.throws(() => resolveMetadataBase("https:///"), /Invalid NEXT_PUBLIC_SITE_URL/)
})
