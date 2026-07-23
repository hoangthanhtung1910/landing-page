import type { Model } from 'mongoose';
import type { ZodType } from 'zod';
import {
  conflictError,
  extractVersion,
  notFoundError,
  serializeDoc,
  validateOrThrow,
} from './content.common';

interface SingletonDoc {
  _id: unknown;
  version: number;
}

/**
 * Base for singleton content sections (hero, seo — T025). Exactly one document
 * per collection (seeded). Writes are **draft revisions**: they set
 * `publishState: 'draft'` on the working copy and NEVER touch the live release
 * (which is a separate immutable snapshot), and they use optimistic concurrency —
 * the client must send the current `version`, and a stale write is rejected `409`.
 */
export abstract class SingletonContentService<T> {
  protected constructor(
    private readonly model: Model<SingletonDoc>,
    private readonly schema: ZodType<T>,
    private readonly label: string,
    /**
     * Optional content fields that a PUT clears when omitted (PUT is a full
     * replacement, not a patch). Required fields are always present in a valid body.
     */
    private readonly clearableKeys: readonly string[] = [],
  ) {}

  /** The current (possibly draft) singleton, with `version` + `publishState`. */
  async get(): Promise<Record<string, unknown>> {
    const doc = await this.model.findOne().lean<Record<string, unknown>>().exec();
    if (!doc) throw notFoundError(this.label);
    return serializeDoc(doc);
  }

  /** Validate + update the singleton under optimistic concurrency. */
  async update(body: unknown): Promise<Record<string, unknown>> {
    const { version, fields } = extractVersion(body);
    const parsed = validateOrThrow(this.schema, fields) as Record<string, unknown>;

    const existing = await this.model.findOne().exec();
    if (!existing) throw notFoundError(this.label);

    // PUT replaces: clear any optional field the client omitted this time.
    const unset: Record<string, ''> = {};
    for (const key of this.clearableKeys) {
      if (!(key in parsed)) unset[key] = '';
    }
    const ops: Record<string, unknown> = {
      $set: { ...parsed, publishState: 'draft' },
      $inc: { version: 1 },
    };
    if (Object.keys(unset).length > 0) ops.$unset = unset;

    const updated = await this.model
      .findOneAndUpdate({ _id: existing._id, version }, ops, { new: true })
      .lean<Record<string, unknown>>()
      .exec();

    if (!updated) {
      // Re-read so the 409 reports the ACTUAL current version — `existing` may have
      // been bumped by a concurrent write between our read and this update.
      const fresh = await this.model.findById(existing._id).lean<{ version: number }>().exec();
      throw conflictError(fresh?.version ?? null);
    }
    return serializeDoc(updated);
  }
}
