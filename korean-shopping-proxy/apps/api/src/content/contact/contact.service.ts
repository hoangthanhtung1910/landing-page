import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, type Model } from 'mongoose';
import { contactChannelSchema } from '@vyvy/content-types';
import {
  conflictError,
  extractVersion,
  notFoundError,
  serializeDoc,
  validateOrThrow,
  validationError,
} from '../content.common';

interface ContactDoc {
  _id: unknown;
  type: string;
  order: number;
  version: number;
}

interface OrderDoc {
  _id: string;
  orderedIds: string[];
  version: number;
}

/** Section key for the single-document contact ordering record. */
const ORDER_KEY = 'contact';

/** Mongo duplicate-key error (E11000) — a unique index or a racing upsert on `_id`. */
function isDuplicateKey(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}

/**
 * Contact-channel admin service (T025b). List type with create/update/delete/
 * reorder. Enforces the deterministic-identity invariant (INV-10): each channel
 * `type` may appear at most once, rejected `422` — so a CtaRef always resolves and
 * the same rule that the publish validator applies never surprises the admin.
 * Writes are draft revisions (never touch the live release snapshot).
 */
@Injectable()
export class ContactService {
  constructor(
    @InjectModel('ContactChannel') private readonly model: Model<ContactDoc>,
    @InjectModel('ContentOrder') private readonly orders: Model<OrderDoc>,
  ) {}

  /** The authoritative ordering array, or null if the record hasn't been initialized yet. */
  private async orderedIds(): Promise<string[] | null> {
    const doc = await this.orders.findById(ORDER_KEY).lean<OrderDoc>().exec();
    return doc?.orderedIds ?? null;
  }

  /**
   * Materialize the ordering record if it doesn't exist yet, seeded from the current
   * per-doc `order` at version 0.
   *
   * Without this, the pre-first-reorder state has NO concurrency control: `getOrder`
   * would hand out a synthetic `version: 0` that isn't stored, so there is nothing to
   * compare-and-swap against and `create`/`remove` version bumps silently no-op.
   * `$setOnInsert` + `upsert` is idempotent, and a racing initializer just loses the
   * duplicate-key insert — either way exactly one version-0 record exists afterwards.
   */
  private async ensureOrderDoc(): Promise<void> {
    if (await this.orders.exists({ _id: ORDER_KEY })) return;
    const docs = await this.model.find().sort({ order: 1 }).lean<ContactDoc[]>().exec();
    const orderedIds = docs.map((d) => String(d._id));
    try {
      await this.orders
        .updateOne({ _id: ORDER_KEY }, { $setOnInsert: { orderedIds, version: 0 } }, { upsert: true })
        .exec();
    } catch (err) {
      if (!isDuplicateKey(err)) throw err; // a concurrent initializer won — fine
    }
  }

  /**
   * All channels in display order, with `version`/`publishState`. Ordering comes
   * from the single ordering document once it exists; otherwise the seeded per-doc
   * `order`. Ids absent from the ordering array (e.g. just created) sort last,
   * keeping their relative `order` (Array#sort is stable).
   */
  async list(): Promise<Record<string, unknown>[]> {
    const docs = await this.model.find().sort({ order: 1 }).lean<Record<string, unknown>[]>().exec();
    const order = await this.orderedIds();
    if (order) {
      const rank = new Map(order.map((id, i) => [id, i]));
      docs.sort(
        (a, b) =>
          (rank.get(String(a._id)) ?? Number.MAX_SAFE_INTEGER) -
          (rank.get(String(b._id)) ?? Number.MAX_SAFE_INTEGER),
      );
    }
    return docs.map(serializeDoc);
  }

  private duplicateTypeError(type: string): never {
    throw validationError([
      { path: ['type'], message: `a "${type}" contact channel already exists (each type may appear once)` },
    ]);
  }

  /** Friendly pre-check for the common (non-racing) case; the unique index is the race-safe guarantee. */
  private async assertTypeUnique(type: string, exceptId?: unknown): Promise<void> {
    const filter: Record<string, unknown> = { type };
    if (exceptId !== undefined) filter._id = { $ne: exceptId };
    if (await this.model.exists(filter)) this.duplicateTypeError(type);
  }

  /** The live `version` of a channel (for a fresh `409` details), or null if it's gone. */
  private async currentVersion(id: unknown): Promise<number | null> {
    const doc = await this.model.findById(id).lean<{ version: number }>().exec();
    return doc?.version ?? null;
  }

  async create(body: unknown): Promise<Record<string, unknown>> {
    const parsed = validateOrThrow(contactChannelSchema, body);
    await this.assertTypeUnique(parsed.type);
    // BEFORE inserting, so the materialized array reflects the pre-create state and
    // the $push below doesn't double-add the new id.
    await this.ensureOrderDoc();

    const last = await this.model.findOne().sort({ order: -1 }).lean<ContactDoc>().exec();
    const order = (last?.order ?? -1) + 1;
    try {
      const created = await this.model.create({ ...parsed, order, publishState: 'draft', version: 0 });
      // Keep the ordering record complete (single-doc $push) and bump its version so a
      // reorder prepared against the old list is rejected. No-op before the first reorder.
      await this.orders
        .updateOne(
          { _id: ORDER_KEY },
          { $push: { orderedIds: String(created._id) }, $inc: { version: 1 } },
        )
        .exec();
      return serializeDoc(created.toObject() as unknown as Record<string, unknown>);
    } catch (err) {
      if (isDuplicateKey(err)) this.duplicateTypeError(parsed.type); // unique index (race-safe)
      throw err;
    }
  }

  async update(id: string, body: unknown): Promise<Record<string, unknown>> {
    const { version, fields } = extractVersion(body);
    const parsed = validateOrThrow(contactChannelSchema, fields);

    // A malformed id must be a 404, not a Mongoose CastError → 500.
    if (!isValidObjectId(id)) throw notFoundError('Contact channel');
    const existing = await this.model.findById(id).lean<ContactDoc>().exec();
    if (!existing) throw notFoundError('Contact channel');
    await this.assertTypeUnique(parsed.type, existing._id);

    try {
      const updated = await this.model
        .findOneAndUpdate(
          { _id: id, version },
          { $set: { ...(parsed as Record<string, unknown>), publishState: 'draft' }, $inc: { version: 1 } },
          { new: true },
        )
        .lean<Record<string, unknown>>()
        .exec();

      if (!updated) throw conflictError(await this.currentVersion(id));
      return serializeDoc(updated);
    } catch (err) {
      if (isDuplicateKey(err)) this.duplicateTypeError(parsed.type); // unique index (race-safe)
      throw err;
    }
  }

  async remove(id: string, version: number): Promise<void> {
    if (!isValidObjectId(id)) throw notFoundError('Contact channel');
    const existing = await this.model.findById(id).lean<ContactDoc>().exec();
    if (!existing) throw notFoundError('Contact channel');
    await this.ensureOrderDoc(); // so the $pull + version bump below actually apply
    const deleted = await this.model.findOneAndDelete({ _id: id, version }).lean().exec();
    if (!deleted) throw conflictError(await this.currentVersion(id));
    await this.orders
      .updateOne({ _id: ORDER_KEY }, { $pull: { orderedIds: id }, $inc: { version: 1 } })
      .exec();
  }

  /**
   * Current ordering + its version — the handle a client echoes back to reorder.
   * Materializes the record first so the returned version is always a REAL, stored
   * value that a later reorder can compare-and-swap against.
   */
  async getOrder(): Promise<{ orderedIds: string[]; version: number }> {
    await this.ensureOrderDoc();
    const doc = await this.orders.findById(ORDER_KEY).lean<OrderDoc>().exec();
    return { orderedIds: doc?.orderedIds ?? [], version: doc?.version ?? 0 };
  }

  private async orderVersion(): Promise<number> {
    const doc = await this.orders.findById(ORDER_KEY).lean<OrderDoc>().exec();
    return doc?.version ?? 0;
  }

  /**
   * Reorder under optimistic concurrency. `orderedIds` must be a permutation of the
   * existing channel ids, and `orderVersion` must match the stored ordering version.
   *
   * The whole ordering is one field in ONE document, so the write is genuinely
   * atomic (unlike N per-item updates or an `updateMany`, which are not isolated
   * across documents). The version filter turns "last writer wins" into a real
   * conflict: of two concurrent reorders, exactly one commits and the other gets 409.
   */
  async reorder(body: unknown): Promise<Record<string, unknown>[]> {
    if (typeof body !== 'object' || body === null) {
      throw validationError([{ path: [], message: 'body must be an object' }]);
    }
    const { orderedIds, orderVersion } = body as Record<string, unknown>;

    if (typeof orderVersion !== 'number' || !Number.isInteger(orderVersion) || orderVersion < 0) {
      throw validationError([
        { path: ['orderVersion'], message: 'orderVersion (current integer) is required' },
      ]);
    }
    if (!Array.isArray(orderedIds) || orderedIds.some((v) => typeof v !== 'string')) {
      throw validationError([{ path: ['orderedIds'], message: 'orderedIds must be an array of ids' }]);
    }

    // Check the ordering handle before validating the id set. A create/delete may
    // have changed both the set and the version; that is a concurrency conflict,
    // not a malformed permutation.
    await this.ensureOrderDoc();
    const currentOrderVersion = await this.orderVersion();
    if (currentOrderVersion !== orderVersion) {
      throw conflictError(currentOrderVersion);
    }

    const ids = orderedIds as string[];
    const existing = await this.model.find().lean<ContactDoc[]>().exec();
    const existingIds = existing.map((d) => String(d._id));
    const sameSet =
      ids.length === existingIds.length && new Set(ids).size === ids.length && ids.every((i) => existingIds.includes(i));
    if (!sameSet) {
      const freshOrderVersion = await this.orderVersion();
      if (freshOrderVersion !== orderVersion) {
        throw conflictError(freshOrderVersion);
      }
      throw validationError([
        { path: ['orderedIds'], message: 'orderedIds must list each existing channel id exactly once' },
      ]);
    }

    // The record is guaranteed to exist, so this is a plain compare-and-swap on a
    // single document: a stale `orderVersion` matches nothing → 409.
    const updated = await this.orders
      .findOneAndUpdate(
        { _id: ORDER_KEY, version: orderVersion },
        { $set: { orderedIds: ids }, $inc: { version: 1 } },
        { new: true },
      )
      .exec();
    if (!updated) throw conflictError(await this.orderVersion());
    return this.list();
  }
}
