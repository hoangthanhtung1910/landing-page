import { HttpException, HttpStatus } from '@nestjs/common';
import type { ZodType } from 'zod';

/**
 * Shared helpers for the admin content CRUD services (T025). Input is validated
 * with the SHARED public Zod schemas (`@vyvy/content-types`) so the admin API and
 * the public contract can never drift, and validation runs everywhere (including
 * the tsx test runner, which does not emit class-validator metadata).
 */

/** Standardized `422 VALIDATION` with per-field problems from a Zod error. */
export function validationError(
  issues: { path: (string | number)[]; message: string }[],
): HttpException {
  const details = issues.map((i) => ({
    field: i.path.join('.') || '(root)',
    message: i.message,
  }));
  return new HttpException(
    { code: 'VALIDATION', message: 'Content validation failed.', details },
    HttpStatus.UNPROCESSABLE_ENTITY,
  );
}

/** Validate `data` against a shared schema; throw `422` on failure, return the parsed value. */
export function validateOrThrow<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) throw validationError(result.error.issues);
  return result.data;
}

/**
 * Split an admin write body into the optimistic-concurrency `version` and the
 * content fields. A write MUST carry the current integer `version` (FR-036);
 * a missing/invalid one is a `422` on the `version` field.
 */
export function extractVersion(body: unknown): { version: number; fields: Record<string, unknown> } {
  if (typeof body !== 'object' || body === null) {
    throw validationError([{ path: [], message: 'body must be an object' }]);
  }
  const { version, ...fields } = body as Record<string, unknown>;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 0) {
    throw validationError([{ path: ['version'], message: 'version (current integer) is required' }]);
  }
  return { version, fields };
}

/** `409 CONFLICT` for a stale optimistic-concurrency write; `details.currentVersion` guides a retry. */
export function conflictError(currentVersion: number | null): HttpException {
  return new HttpException(
    {
      code: 'CONFLICT',
      message: 'This item was modified by someone else. Reload and retry.',
      details: currentVersion === null ? undefined : { currentVersion },
    },
    HttpStatus.CONFLICT,
  );
}

/** `404 NOT_FOUND`. */
export function notFoundError(what: string): HttpException {
  return new HttpException(
    { code: 'NOT_FOUND', message: `${what} not found.` },
    HttpStatus.NOT_FOUND,
  );
}

/**
 * Admin-facing serialization of a content document: exposes the editable fields
 * plus `version`/`publishState` (which the admin UI needs), maps `_id`→`id`, and
 * drops Mongo/seed bookkeeping (`__v`, `seedKey`, timestamps).
 */
export function serializeDoc(doc: Record<string, unknown>): Record<string, unknown> {
  const { _id, __v, seedKey, createdAt, updatedAt, ...rest } = doc;
  void __v;
  void seedKey;
  void createdAt;
  void updatedAt;
  return { id: String(_id), ...rest };
}
