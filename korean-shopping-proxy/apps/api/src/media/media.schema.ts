import { Schema } from 'mongoose';
import { COLLECTION_NAMES } from '../database/collection-names';

/**
 * Media asset metadata (T013). Binaries live behind the storage adapter
 * (local dev, S3/CDN-ready); only metadata + a stable public URL are stored here.
 * Public read, admin-only mutation (FR-027/FR-039); no signed URLs in v1.
 */
export const MediaAssetSchema = new Schema(
  {
    objectKey: { type: String, required: true, unique: true },
    url: { type: String, required: true },
    mimeType: { type: String, required: true },
    bytes: { type: Number, required: true },
    width: Number,
    height: Number,
    alt: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: true },
);

export const mediaModels = [
  { name: 'MediaAsset', schema: MediaAssetSchema, collection: COLLECTION_NAMES.MediaAsset },
];
