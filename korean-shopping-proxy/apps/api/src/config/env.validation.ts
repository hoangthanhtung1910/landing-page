import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
  validateSync,
} from 'class-validator';

const toBool = ({ value }: { value: unknown }): unknown => {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return value;
};

const UNSAFE_SECRETS = new Set([
  'change-me',
  'change-me-immediately',
  'change-me-in-every-environment',
  'change-me-shared-with-web',
  'change-me-shared-with-api',
]);

/**
 * Boot-time env validation (T005/T007, expanded per P2-02). Fail-closed: an
 * invalid/missing required variable throws before the app starts. All URLs/origins
 * come from env (production domain not finalized).
 */
export class EnvVars {
  @IsOptional()
  @IsIn(['development', 'test', 'production'])
  NODE_ENV = 'development';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 4000;

  @Matches(/^mongodb(\+srv)?:\/\/.+/, {
    message: 'MONGO_URI must be a mongodb:// or mongodb+srv:// URI',
  })
  MONGO_URI!: string;

  // --- Auth / session ---
  @IsString()
  @IsNotEmpty()
  SESSION_SECRET!: string;

  @IsOptional()
  @IsString()
  SESSION_COOKIE_NAME = 'vyvy_admin_session';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(720)
  SESSION_TTL_HOURS = 12;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  SESSION_COOKIE_SECURE = false;

  @IsOptional()
  @IsIn(['lax', 'strict', 'none'])
  SESSION_COOKIE_SAMESITE = 'lax';

  // --- Login throttling (T024B, FR-038) ---
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  LOGIN_MAX_ATTEMPTS = 5;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1440)
  LOGIN_LOCKOUT_MINUTES = 15;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1440)
  LOGIN_ATTEMPT_WINDOW_MINUTES = 15;

  // --- CORS (validated semantically in validateEnv) ---
  @IsString()
  @IsNotEmpty()
  CORS_ORIGINS!: string;

  /**
   * Express `trust proxy` setting. Controls how `req.ip` is derived from
   * `X-Forwarded-For` — critical because the login throttle keys on `req.ip`.
   * Leave unset/`false` for direct connections (uses the socket IP, unspoofable).
   * Behind a known reverse proxy set the hop count (e.g. `1`) or the trusted proxy
   * IPs/subnets (e.g. `loopback,10.0.0.0/8`) so the REAL client IP is used without
   * trusting a spoofable header. Never set `true` in production.
   */
  @IsOptional()
  @IsString()
  TRUST_PROXY?: string;

  // --- Media / storage ---
  @IsOptional()
  @IsIn(['local', 's3'])
  STORAGE_DRIVER = 'local';

  @IsOptional()
  @IsString()
  STORAGE_LOCAL_DIR = './storage/media';

  @IsOptional()
  @IsUrl({ require_tld: false })
  MEDIA_PUBLIC_BASE_URL?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  MEDIA_MAX_BYTES = 5_242_880;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20000)
  MEDIA_MAX_DIMENSION = 6000;

  @IsOptional()
  @Matches(/^(image\/[a-z0-9.+-]+)(,image\/[a-z0-9.+-]+)*$/, {
    message: 'MEDIA_ALLOWED_MIME must be a comma-separated list of image/* MIME types',
  })
  MEDIA_ALLOWED_MIME = 'image/jpeg,image/png,image/webp';

  // --- Revalidation ---
  @IsOptional()
  @IsUrl({ require_tld: false })
  WEB_REVALIDATE_URL?: string;

  @IsOptional()
  @IsString()
  REVALIDATE_SECRET?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  REVALIDATE_RETRIES = 2;

  // --- Seed admin ---
  @IsOptional()
  @IsString()
  SEED_ADMIN_USERNAME = 'admin';

  @IsOptional()
  @IsString()
  SEED_ADMIN_PASSWORD = 'change-me';
}

/**
 * A CORS entry must be a bare http/https origin: no credentials, path, query,
 * fragment, or wildcard (R2-P2-02).
 */
export function assertOrigin(origin: string): void {
  if (origin === '*' || origin.includes('*')) {
    throw new Error(`CORS_ORIGINS must not contain wildcards: "${origin}"`);
  }
  let u: URL;
  try {
    u = new URL(origin);
  } catch {
    throw new Error(`CORS_ORIGINS contains an invalid origin: "${origin}"`);
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error(`CORS_ORIGINS origins must use http or https: "${origin}"`);
  }
  if (u.username || u.password) {
    throw new Error(`CORS_ORIGINS origins must not contain credentials: "${origin}"`);
  }
  if ((u.pathname !== '/' && u.pathname !== '') || origin.replace(/\/+$/, '').endsWith('/')) {
    throw new Error(`CORS_ORIGINS entries must be bare origins (no path): "${origin}"`);
  }
  if (u.search || u.hash) {
    throw new Error(`CORS_ORIGINS origins must not contain query or fragment: "${origin}"`);
  }
  // Reconstruct and compare so anything beyond scheme://host[:port] is rejected.
  if (u.origin !== origin.replace(/\/$/, '')) {
    throw new Error(`CORS_ORIGINS entries must equal a bare origin: "${origin}"`);
  }
}

/** Parse + fully validate a CORS_ORIGINS value; returns the origin list. */
export function parseCorsOrigins(raw: string): string[] {
  const origins = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (origins.length === 0) {
    throw new Error('CORS_ORIGINS must contain at least one origin.');
  }
  for (const origin of origins) assertOrigin(origin);
  return origins;
}

/**
 * Parse `TRUST_PROXY` into an Express `trust proxy` value. Fail-safe default is
 * `false` (trust nothing → `req.ip` is the socket address, unspoofable). A bare
 * number is a hop count; a comma list is trusted proxy IPs/subnets/keywords.
 */
export function parseTrustProxy(raw: string | undefined): boolean | number | string[] {
  const v = (raw ?? '').trim();
  if (v === '' || v.toLowerCase() === 'false') return false;
  if (v.toLowerCase() === 'true') return true;
  if (/^\d+$/.test(v)) return Number(v);
  return v.split(',').map((s) => s.trim()).filter(Boolean);
}

export function validateEnv(config: Record<string, unknown>): EnvVars {
  const validated = plainToInstance(EnvVars, config, {
    enableImplicitConversion: false,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const details = errors
      .map((e) => Object.values(e.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  // Semantic CORS validation: >=1 entry, each a bare http/https origin.
  parseCorsOrigins(validated.CORS_ORIGINS);

  // Cookie policy dependency: SameSite=None requires Secure (browser requirement).
  if (validated.SESSION_COOKIE_SAMESITE === 'none' && !validated.SESSION_COOKIE_SECURE) {
    throw new Error('SESSION_COOKIE_SAMESITE=none requires SESSION_COOKIE_SECURE=true.');
  }

  // Production hardening: reject unsafe defaults.
  if (validated.NODE_ENV === 'production') {
    if (UNSAFE_SECRETS.has(validated.SESSION_SECRET) || validated.SESSION_SECRET.length < 16) {
      throw new Error('SESSION_SECRET must be a strong, non-default value in production.');
    }
    if (UNSAFE_SECRETS.has(validated.SEED_ADMIN_PASSWORD)) {
      throw new Error('SEED_ADMIN_PASSWORD must not be a default value in production.');
    }
    if (!validated.SESSION_COOKIE_SECURE) {
      throw new Error('SESSION_COOKIE_SECURE must be true in production.');
    }
    if (validated.REVALIDATE_SECRET && UNSAFE_SECRETS.has(validated.REVALIDATE_SECRET)) {
      throw new Error('REVALIDATE_SECRET must not be a default value in production.');
    }
    // `trust proxy: true` trusts a client-supplied X-Forwarded-For, letting an
    // attacker spoof a fresh IP per request and bypass the per-IP login throttle.
    // Require a specific hop count or trusted subnet list instead.
    if (parseTrustProxy(validated.TRUST_PROXY) === true) {
      throw new Error(
        'TRUST_PROXY must not be "true" in production (it trusts a spoofable X-Forwarded-For and ' +
          'defeats the login rate limit). Set a hop count (e.g. 1) or trusted proxy IPs/subnets.',
      );
    }
  }

  return validated;
}
