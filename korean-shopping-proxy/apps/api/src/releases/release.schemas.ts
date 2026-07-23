import { Schema } from 'mongoose';
import { versionField } from '../common/base-fields';
import { COLLECTION_NAMES } from '../database/collection-names';

/** Optional sections an admin can enable/disable (FR-040/FR-051). */
export const OPTIONAL_SECTION_KEYS = [
  'services',
  'trustPoints',
  'processSteps',
  'categories',
  'reviews',
  'faq',
] as const;

export type OptionalSectionKey = (typeof OPTIONAL_SECTION_KEYS)[number];

export type SectionVisibility = Record<OptionalSectionKey, boolean>;

export const DEFAULT_SECTION_VISIBILITY: SectionVisibility = {
  services: true,
  trustPoints: true,
  processSteps: true,
  categories: true,
  reviews: false, // honest empty state until approved reviews exist (FR-043)
  faq: true,
};

const sectionVisibilityShape = OPTIONAL_SECTION_KEYS.reduce(
  (acc, key) => {
    acc[key] = { type: Boolean, default: DEFAULT_SECTION_VISIBILITY[key] };
    return acc;
  },
  {} as Record<string, unknown>,
);

/**
 * An immutable, internally-consistent published page (T010). `content` is the
 * denormalized published SiteContent for this release (this IS the release's
 * content — NOT a fallback/last-good snapshot). `releaseNumber` is monotonic and
 * feeds the public version/ETag.
 */
export const PageReleaseSchema = new Schema(
  {
    releaseNumber: { type: Number, required: true, unique: true },
    sectionVisibility: { type: sectionVisibilityShape, required: true },
    // Denormalized published SiteContent (without `meta`, which is derived).
    content: { type: Schema.Types.Mixed, required: true },
    publishedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
    publishedAt: { type: Date, default: () => new Date() },
    revalidation: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

/**
 * Singleton pointer to the current live release + previous (for rollback) and the
 * working (unpublished) section-visibility draft (T013B).
 */
export const SiteStateSchema = new Schema(
  {
    key: { type: String, default: 'singleton', unique: true },
    currentReleaseId: { type: Schema.Types.ObjectId, ref: 'PageRelease' },
    previousReleaseId: { type: Schema.Types.ObjectId, ref: 'PageRelease' },
    sectionVisibilityDraft: {
      type: sectionVisibilityShape,
      default: () => ({ ...DEFAULT_SECTION_VISIBILITY }),
    },
    version: versionField,
    releaseSequence: { type: Number, default: 1 },
  },
  { timestamps: true },
);

export const releaseModels = [
  { name: 'PageRelease', schema: PageReleaseSchema, collection: COLLECTION_NAMES.PageRelease },
  { name: 'SiteState', schema: SiteStateSchema, collection: COLLECTION_NAMES.SiteState },
];
