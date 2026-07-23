import { SchemaDefinitionProperty } from 'mongoose';

/**
 * Shared CMS base fields (T010): draft/published state, list ordering, and an
 * optimistic-concurrency `version` (bumped on each save; stale writes are
 * rejected with 409 in US2). `timestamps: true` on the schema adds createdAt/updatedAt.
 */
export const publishStateField: SchemaDefinitionProperty = {
  type: String,
  enum: ['draft', 'published'],
  default: 'draft',
  index: true,
};

export const orderField: SchemaDefinitionProperty = {
  type: Number,
  default: 0,
};

export const versionField: SchemaDefinitionProperty = {
  type: Number,
  default: 0,
};

/**
 * Stable identifier for seed-owned records so the seed can upsert (own + update)
 * only its own data and never touch admin-created content (P1-01). Sparse-unique:
 * admin records omit it and are excluded from the index.
 */
export const seedKeyField: SchemaDefinitionProperty = {
  type: String,
  index: { unique: true, sparse: true },
};
