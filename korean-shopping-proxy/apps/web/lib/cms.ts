import { type SiteContent, safeParseSiteContent } from "@vyvy/content-types"

/**
 * Landing-page content client (T016). Server-side fetch of the CMS public release
 * at build/ISR time. FAIL-CLOSED: if valid published content cannot be fetched,
 * this throws so the build/deploy fails rather than shipping an empty page
 * (FR-030). There is NO custom snapshot/last-good fallback — runtime resilience
 * relies on Next.js ISR defaults.
 *
 * Validation is a full runtime schema (`@vyvy/content-types` Zod), not a shallow
 * existence check: empty/partial nested objects, missing Zalo/Kakao contacts,
 * bad images, and malformed optional sections are rejected (P1-02).
 */

export const CONTENT_TAG = "site-content"

const DEFAULT_TIMEOUT_MS = 5000

function required(name: string): string {
  const v = process.env[name]
  if (!v || v.trim() === "") {
    throw new Error(`Missing required env ${name} (fail-closed: cannot build without the CMS URL).`)
  }
  return v
}

/** Bounded, finite, positive timeout — never trust a raw Number() result. */
export function resolveTimeoutMs(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === "") return DEFAULT_TIMEOUT_MS
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0 || n > 60000) {
    throw new Error(
      `Invalid CMS_FETCH_TIMEOUT_MS="${raw}" (expected a finite number in 1..60000 ms).`,
    )
  }
  return n
}

/** Validate an unknown payload as a complete public SiteContent (throws fail-closed). */
export function parseContentOrThrow(data: unknown): SiteContent {
  const result = safeParseSiteContent(data)
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ")
    throw new Error(`CMS returned malformed or partial content (fail-closed): ${issues}`)
  }
  return result.data
}

export async function getSiteContent(): Promise<SiteContent> {
  const base = required("CMS_PUBLIC_URL").replace(/\/+$/, "")
  const timeout = resolveTimeoutMs(process.env.CMS_FETCH_TIMEOUT_MS)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  let res: Response
  try {
    res = await fetch(`${base}/public/content`, {
      signal: controller.signal,
      next: { tags: [CONTENT_TAG] },
    })
  } catch (err) {
    throw new Error(
      `Failed to reach CMS at ${base}/public/content (fail-closed). Cause: ${(err as Error).message}`,
    )
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) {
    throw new Error(`CMS responded ${res.status} (fail-closed: refusing to render an empty page).`)
  }

  let data: unknown
  try {
    data = await res.json()
  } catch {
    throw new Error("CMS returned invalid JSON (fail-closed: refusing to render an empty page).")
  }
  return parseContentOrThrow(data)
}
