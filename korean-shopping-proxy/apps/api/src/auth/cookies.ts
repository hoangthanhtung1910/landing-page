import type { CookieOptions } from 'express';

/**
 * Parse a raw `Cookie` header into a name→value map. Avoids an extra
 * cookie-parser dependency; only what we need (read our own session/CSRF cookie).
 */
export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    if (!name) continue;
    const raw = part.slice(eq + 1).trim();
    // A malformed percent-encoding must NOT throw (would surface as a 500 on any
    // request carrying a bad cookie). Fall back to the raw value.
    try {
      out[name] = decodeURIComponent(raw);
    } catch {
      out[name] = raw;
    }
  }
  return out;
}

export interface CookiePolicy {
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  ttlMs: number;
}

/** Options for the HttpOnly session cookie (not readable by JS). */
export function sessionCookieOptions(policy: CookiePolicy): CookieOptions {
  return {
    httpOnly: true,
    secure: policy.secure,
    sameSite: policy.sameSite,
    path: '/',
    maxAge: policy.ttlMs,
  };
}

/**
 * Options for the CSRF cookie. NOT HttpOnly: the SPA reads it and echoes the
 * value in the `x-csrf-token` header (double-submit); the server still verifies
 * against the session's stored token, so the readable cookie is only transport.
 */
export function csrfCookieOptions(policy: CookiePolicy): CookieOptions {
  return {
    httpOnly: false,
    secure: policy.secure,
    sameSite: policy.sameSite,
    path: '/',
    maxAge: policy.ttlMs,
  };
}
