/**
 * Resolve `NEXT_PUBLIC_SITE_URL` into a Next `metadataBase` URL (T023 / r2 / r3).
 *
 * FAIL-CLOSED and REQUIRED, mirroring `cms.ts`'s `required("CMS_PUBLIC_URL")` and
 * `next.config`'s MEDIA_ORIGIN handling. Without a site origin, a RELATIVE metadata
 * URL (e.g. a site-relative OG image, which the shared schema permits) has no
 * correct base and Next would resolve it against localhost — wrong-domain metadata.
 * We therefore cannot safely build metadata without it:
 *   - unset/empty → THROWS (r3: the missing case is a wrong-domain risk, not a soft default);
 *   - declared-but-invalid (unparseable, non-http(s), hostname-less) → THROWS;
 *   - valid absolute http(s) URL → returns the `URL`.
 * Absolute CMS/CDN media URLs are unaffected (they win over the base).
 */
export function resolveMetadataBase(raw: string | undefined): URL {
  if (raw === undefined || raw.trim() === "") {
    throw new Error(
      `Missing NEXT_PUBLIC_SITE_URL (fail-closed: cannot build correct canonical/OG ` +
        `metadata without the site origin — a relative OG image would resolve to the ` +
        `wrong domain). Set it to an absolute URL like "https://vyvyorder.example.com".`,
    )
  }
  const value = raw.trim()
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error(
      `Invalid NEXT_PUBLIC_SITE_URL="${raw}" (expected an absolute URL like ` +
        `"https://vyvyorder.example.com"). Fail-closed: refusing to build metadata ` +
        `against the wrong domain.`,
    )
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(
      `Invalid NEXT_PUBLIC_SITE_URL="${raw}" (must be an http(s) URL). Fail-closed.`,
    )
  }
  if (!url.hostname) {
    throw new Error(
      `Invalid NEXT_PUBLIC_SITE_URL="${raw}" (missing hostname). Fail-closed.`,
    )
  }
  return url
}
