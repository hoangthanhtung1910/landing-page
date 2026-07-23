/** @type {import('next').NextConfig} */

// Media base is configured via env (production domain is not finalized).
// MEDIA_ORIGIN is the full public media base, e.g.
// "http://localhost:4000/media/files" or "https://cdn.example.com/media/files".
// Its host + path scope the allowed images.
const mediaOrigin = process.env.MEDIA_ORIGIN

const remotePatterns = []
if (mediaOrigin) {
  let u
  try {
    u = new URL(mediaOrigin)
  } catch {
    // Fail-closed: a declared-but-invalid MEDIA_ORIGIN must break the build,
    // not silently disable remote images.
    throw new Error(
      `Invalid MEDIA_ORIGIN: "${mediaOrigin}". Expected an absolute URL like "https://cdn.example.com/media/files".`,
    )
  }
  // Scope allowed images to the media path only (e.g. "/media/files/**"), never the whole host.
  const basePath = u.pathname === '/' ? '/media' : u.pathname.replace(/\/+$/, '')
  remotePatterns.push({
    protocol: u.protocol.replace(':', ''),
    hostname: u.hostname,
    port: u.port || undefined,
    pathname: `${basePath}/**`,
  })
}

const nextConfig = {
  // Fail-closed builds: do NOT ignore type errors (FR-030 hardening, review Important #12).
  typescript: {
    ignoreBuildErrors: false,
  },
  // Image optimization enabled; remote images allow-listed to the media path via env.
  images: {
    remotePatterns,
    // The local CMS serves uploaded media from localhost. Next.js blocks
    // private-network image sources by default, so opt in for local development
    // only and keep production protected.
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
  },
}

export default nextConfig
