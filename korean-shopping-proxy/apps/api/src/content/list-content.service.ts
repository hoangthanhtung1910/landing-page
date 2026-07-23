import { isValidObjectId, type Model } from 'mongoose';
import type { ZodType } from 'zod';
import {
  conflictError,
  extractVersion,
  notFoundError,
  serializeDoc,
  validateOrThrow,
  validationError,
} from './content.common';

interface ListDoc {
  _id: unknown;
  order: number;
  version: number;
}

interface OrderDoc {
  _id: string;
  orderedIds: string[];
  version: number;
}

function isDuplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;
}

/**
 * Shared CRUD + ordering implementation for managed list sections (T026/T027).
 * Item edits use per-document optimistic concurrency; ordering is a single
 * compare-and-swap document so concurrent reorders cannot blend or overwrite.
 */
export abstract class ListContentService<T> {
  protected constructor(
    private readonly model: Model<ListDoc>,
    private readonly orders: Model<OrderDoc>,
    private readonly schema: ZodType<T>,
    private readonly label: string,
    private readonly orderKey: string,
    private readonly clearableKeys: readonly string[] = [],
  ) {}

  private async ensureOrder(): Promise<OrderDoc> {
    const current = await this.orders.findById(this.orderKey).lean<OrderDoc>().exec();
    if (current) return current;

    const docs = await this.model.find().sort({ order: 1, _id: 1 }).lean<ListDoc[]>().exec();
    try {
      const created = await this.orders
        .findOneAndUpdate(
          { _id: this.orderKey },
          {
            $setOnInsert: {
              orderedIds: docs.map((doc) => String(doc._id)),
              version: 0,
            },
          },
          { upsert: true, new: true },
        )
        .lean<OrderDoc>()
        .exec();
      if (created) return created;
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
    }

    const winner = await this.orders.findById(this.orderKey).lean<OrderDoc>().exec();
    if (!winner) throw new Error(`Failed to initialize ${this.orderKey} ordering.`);
    return winner;
  }

  private async currentVersion(id: unknown): Promise<number | null> {
    const doc = await this.model.findById(id).lean<{ version: number }>().exec();
    return doc?.version ?? null;
  }

  private async currentOrderVersion(): Promise<number> {
    const doc = await this.orders.findById(this.orderKey).lean<OrderDoc>().exec();
    return doc?.version ?? 0;
  }

  async list(): Promise<Record<string, unknown>[]> {
    const [docs, order] = await Promise.all([
      this.model.find().sort({ order: 1, _id: 1 }).lean<Record<string, unknown>[]>().exec(),
      this.ensureOrder(),
    ]);
    const rank = new Map(order.orderedIds.map((id, index) => [id, index]));
    docs.sort(
      (a, b) =>
        (rank.get(String(a._id)) ?? Number.MAX_SAFE_INTEGER) -
        (rank.get(String(b._id)) ?? Number.MAX_SAFE_INTEGER),
    );
    return docs.map(serializeDoc);
  }

  async get(id: string): Promise<Record<string, unknown>> {
    if (!isValidObjectId(id)) throw notFoundError(this.label);
    const doc = await this.model.findById(id).lean<Record<string, unknown>>().exec();
    if (!doc) throw notFoundError(this.label);
    return serializeDoc(doc);
  }

  async create(body: unknown): Promise<Record<string, unknown>> {
    const parsed = validateOrThrow(this.schema, body) as Record<string, unknown>;
    await this.ensureOrder();
    const last = await this.model.findOne().sort({ order: -1 }).lean<ListDoc>().exec();
    const created = await this.model.create({
      ...parsed,
      order: (last?.order ?? -1) + 1,
      publishState: 'draft',
      version: 0,
    });
    await this.orders
      .updateOne(
        { _id: this.orderKey },
        { $push: { orderedIds: String(created._id) }, $inc: { version: 1 } },
      )
      .exec();
    return serializeDoc(created.toObject() as unknown as Record<string, unknown>);
  }

  async update(id: string, body: unknown): Promise<Record<string, unknown>> {
    const { version, fields } = extractVersion(body);
    const parsed = validateOrThrow(this.schema, fields) as Record<string, unknown>;
    if (!isValidObjectId(id)) throw notFoundError(this.label);

    const existing = await this.model.findById(id).lean<ListDoc>().exec();
    if (!existing) throw notFoundError(this.label);

    const unset: Record<string, ''> = {};
    for (const key of this.clearableKeys) {
      if (!(key in parsed)) unset[key] = '';
    }
    const operations: Record<string, unknown> = {
      $set: { ...parsed, publishState: 'draft' },
      $inc: { version: 1 },
    };
    if (Object.keys(unset).length > 0) operations.$unset = unset;

    const updated = await this.model
      .findOneAndUpdate({ _id: id, version }, operations, { new: true })
      .lean<Record<string, unknown>>()
      .exec();
    if (!updated) throw conflictError(await this.currentVersion(id));
    return serializeDoc(updated);
  }

  async remove(id: string, version: number): Promise<void> {
    if (!isValidObjectId(id)) throw notFoundError(this.label);
    await this.ensureOrder();
    const existing = await this.model.findById(id).lean<ListDoc>().exec();
    if (!existing) throw notFoundError(this.label);

    const deleted = await this.model.findOneAndDelete({ _id: id, version }).lean().exec();
    if (!deleted) throw conflictError(await this.currentVersion(id));
    await this.orders
      .updateOne(
        { _id: this.orderKey },
        { $pull: { orderedIds: id }, $inc: { version: 1 } },
      )
      .exec();
  }

  async getOrder(): Promise<{ orderedIds: string[]; version: number }> {
    const order = await this.ensureOrder();
    return { orderedIds: order.orderedIds, version: order.version };
  }

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
    if (!Array.isArray(orderedIds) || orderedIds.some((value) => typeof value !== 'string')) {
      throw validationError([{ path: ['orderedIds'], message: 'orderedIds must be an array of ids' }]);
    }

    const order = await this.ensureOrder();
    if (order.version !== orderVersion) throw conflictError(order.version);

    const ids = orderedIds as string[];
    const existing = await this.model.find().select({ _id: 1 }).lean<ListDoc[]>().exec();
    const existingIds = new Set(existing.map((doc) => String(doc._id)));
    const sameSet =
      ids.length === existingIds.size && new Set(ids).size === ids.length && ids.every((id) => existingIds.has(id));
    if (!sameSet) {
      const freshVersion = await this.currentOrderVersion();
      if (freshVersion !== orderVersion) throw conflictError(freshVersion);
      throw validationError([
        { path: ['orderedIds'], message: `orderedIds must list each existing ${this.label} exactly once` },
      ]);
    }

    const updated = await this.orders
      .findOneAndUpdate(
        { _id: this.orderKey, version: orderVersion },
        { $set: { orderedIds: ids }, $inc: { version: 1 } },
        { new: true },
      )
      .exec();
    if (!updated) throw conflictError(await this.currentOrderVersion());
    return this.list();
  }
}
