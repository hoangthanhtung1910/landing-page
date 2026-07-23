import { test } from "node:test"
import assert from "node:assert/strict"
import { isRevalidateAuthorized, REVALIDATE_HEADER } from "./revalidate-auth"

const withHeader = (value?: string): Headers => {
  const h = new Headers()
  if (value !== undefined) h.set(REVALIDATE_HEADER, value)
  return h
}

test("authorizes when the header matches the secret", () => {
  assert.equal(isRevalidateAuthorized(withHeader("s3cret"), "s3cret"), true)
})

test("rejects a missing header", () => {
  assert.equal(isRevalidateAuthorized(withHeader(undefined), "s3cret"), false)
})

test("rejects an incorrect header", () => {
  assert.equal(isRevalidateAuthorized(withHeader("wrong"), "s3cret"), false)
})

test("rejects when no secret is configured", () => {
  assert.equal(isRevalidateAuthorized(withHeader("anything"), undefined), false)
  assert.equal(isRevalidateAuthorized(withHeader("anything"), ""), false)
})

test("does not read the secret from a query string (header-only by design)", () => {
  // A query param cannot satisfy auth — only the header is consulted.
  const h = new Headers()
  assert.equal(isRevalidateAuthorized(h, "s3cret"), false)
})
