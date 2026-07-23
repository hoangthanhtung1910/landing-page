/**
 * Revalidation auth (P2-01). The shared secret is accepted ONLY via the
 * `x-revalidate-secret` header — never a query string, which can leak into
 * access logs / monitoring / request history. Constant-time-ish comparison.
 */
export const REVALIDATE_HEADER = "x-revalidate-secret"

export function isRevalidateAuthorized(
  headers: Headers,
  expected: string | undefined,
): boolean {
  if (!expected || expected.trim() === "") return false
  const provided = headers.get(REVALIDATE_HEADER)
  if (!provided || provided.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < provided.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return diff === 0
}
