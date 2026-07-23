import { Schema } from 'mongoose';
import {
  orderField,
  publishStateField,
  seedKeyField,
  versionField,
} from '../common/base-fields';

// Embedded value shapes as sub-schemas (no own _id, not validated when absent).
const sub = { _id: false } as const;

const imageRef = new Schema(
  {
    src: { type: String, required: true },
    alt: { type: String, required: true },
    width: Number,
    height: Number,
  },
  sub,
);

const ctaRef = new Schema(
  {
    label: { type: String, required: true },
    channel: { type: String, required: true }, // zalo|kakao|phone|email|social|anchor
    target: String,
  },
  sub,
);

const footerLink = new Schema(
  {
    label: { type: String, required: true },
    href: { type: String, required: true },
  },
  sub,
);

const contactChannelShape = {
  type: {
    type: String,
    enum: ['zalo', 'kakao', 'phone', 'email', 'social'],
    required: true,
  },
  label: { type: String, required: true },
  handle: { type: String, required: true },
  icon: { type: String, required: true },
  external: { type: Boolean, default: true },
};

const opts = { timestamps: true };

// --- Singletons ---
export const BrandSchema = new Schema(
  {
    name: { type: String, required: true },
    slogan: { type: String, required: true },
    tagline: String,
    logo: imageRef,
    publishState: publishStateField,
    version: versionField,
    seedKey: seedKeyField,
  },
  opts,
);

export const HeroSchema = new Schema(
  {
    headline: { type: String, required: true },
    subheadline: { type: String, required: true },
    primaryCta: { type: ctaRef, required: true },
    secondaryCta: ctaRef,
    media: imageRef,
    publishState: publishStateField,
    version: versionField,
    seedKey: seedKeyField,
  },
  opts,
);

export const CtaSchema = new Schema(
  {
    headline: { type: String, required: true },
    subtext: String,
    channels: { type: [ctaRef], default: [] },
    publishState: publishStateField,
    version: versionField,
    seedKey: seedKeyField,
  },
  opts,
);

export const FooterSchema = new Schema(
  {
    contactSummary: { type: String, required: true },
    links: { type: [footerLink], default: [] },
    socials: { type: [contactChannelShape], default: [] },
    copyright: { type: String, required: true },
    publishState: publishStateField,
    version: versionField,
    seedKey: seedKeyField,
  },
  opts,
);

export const SeoSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    canonical: String,
    ogImage: imageRef,
    ogFields: { type: Map, of: String },
    twitterFields: { type: Map, of: String },
    publishState: publishStateField,
    version: versionField,
    seedKey: seedKeyField,
  },
  opts,
);

// --- List items ---
export const ServiceSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, required: true },
    order: orderField,
    publishState: publishStateField,
    version: versionField,
    seedKey: seedKeyField,
  },
  opts,
);

export const TrustPointSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, required: true },
    order: orderField,
    publishState: publishStateField,
    version: versionField,
    seedKey: seedKeyField,
  },
  opts,
);

export const ProcessStepSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    icon: String,
    order: orderField,
    publishState: publishStateField,
    version: versionField,
    seedKey: seedKeyField,
  },
  opts,
);

export const CategorySchema = new Schema(
  {
    name: { type: String, required: true },
    image: { type: imageRef, required: true },
    blurb: String,
    order: orderField,
    publishState: publishStateField,
    version: versionField,
    seedKey: seedKeyField,
  },
  opts,
);

export const ReviewSchema = new Schema(
  {
    name: { type: String, required: true },
    text: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5 },
    location: String,
    avatar: imageRef,
    // Only approved, consented reviews may be exposed publicly (FR-043).
    approved: { type: Boolean, default: false },
    consentGiven: { type: Boolean, default: false },
    order: orderField,
    publishState: publishStateField,
    version: versionField,
    seedKey: seedKeyField,
  },
  opts,
);

export const FaqSchema = new Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
    order: orderField,
    publishState: publishStateField,
    version: versionField,
    seedKey: seedKeyField,
  },
  opts,
);

export const ContactChannelSchema = new Schema(
  {
    ...contactChannelShape,
    order: orderField,
    publishState: publishStateField,
    version: versionField,
    seedKey: seedKeyField,
  },
  opts,
);
// Deterministic-identity invariant (INV-10): at most one channel per type. Enforced
// at the DB level so concurrent creates/updates cannot race past a check-then-write.
ContactChannelSchema.index({ type: 1 }, { unique: true });

/**
 * Per-section display ordering held in ONE document (`_id` = section key, e.g.
 * `'contact'`). A reorder rewrites `orderedIds` in a single-document update, which
 * is the only genuinely atomic primitive available without replica-set
 * transactions — N per-item `order` writes (even via `updateMany`) are not isolated
 * across documents and let concurrent reorders interleave into a mixed ordering.
 * `version` gives the ordering its own optimistic-concurrency handle.
 */
export const ContentOrderSchema = new Schema(
  {
    _id: { type: String }, // section key
    orderedIds: { type: [String], default: [] },
    version: versionField,
  },
  { timestamps: true, _id: false },
);

/** Model registry consumed by ContentModule and the seed script. */
export const contentModels = [
  { name: 'ContentOrder', schema: ContentOrderSchema },
  { name: 'Brand', schema: BrandSchema },
  { name: 'Hero', schema: HeroSchema },
  { name: 'Cta', schema: CtaSchema },
  { name: 'Footer', schema: FooterSchema },
  { name: 'Seo', schema: SeoSchema },
  { name: 'Service', schema: ServiceSchema },
  { name: 'TrustPoint', schema: TrustPointSchema },
  { name: 'ProcessStep', schema: ProcessStepSchema },
  { name: 'Category', schema: CategorySchema },
  { name: 'Review', schema: ReviewSchema },
  { name: 'Faq', schema: FaqSchema },
  { name: 'ContactChannel', schema: ContactChannelSchema },
];

// Additive production indexes for draft lookups and optimistic-concurrency
// diagnostics. Unique identity indexes are declared on their specific schemas.
for (const { name, schema } of contentModels) {
  if (name !== 'ContentOrder') schema.index({ publishState: 1, version: 1 });
}
