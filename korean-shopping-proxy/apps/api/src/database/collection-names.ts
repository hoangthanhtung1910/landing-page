/**
 * Stable MongoDB collection names.
 *
 * Mongoose's implicit pluralization produces hard-to-read names such as
 * `contactchannels`. Keep model names in PascalCase and collection names in
 * plural snake_case instead.
 */
export const COLLECTION_NAMES = {
  AdminSession: 'admin_sessions',
  AdminUser: 'admin_users',
  AuditEvent: 'audit_events',
  Brand: 'brands',
  Category: 'categories',
  ContactChannel: 'contact_channels',
  ContentOrder: 'content_orders',
  Cta: 'ctas',
  Faq: 'faqs',
  Footer: 'footers',
  Hero: 'heroes',
  LoginAttempt: 'login_attempts',
  MediaAsset: 'media_assets',
  PageRelease: 'page_releases',
  ProcessStep: 'process_steps',
  Review: 'reviews',
  SecurityEvent: 'security_events',
  Seo: 'seos',
  Service: 'services',
  SiteState: 'site_states',
  TrustPoint: 'trust_points',
} as const;

export type ModelName = keyof typeof COLLECTION_NAMES;

/** Names created by Mongoose before collection names became explicit. */
export const LEGACY_COLLECTION_NAMES: Record<ModelName, string> = {
  AdminSession: 'adminsessions',
  AdminUser: 'adminusers',
  AuditEvent: 'auditevents',
  Brand: 'brands',
  Category: 'categories',
  ContactChannel: 'contactchannels',
  ContentOrder: 'contentorders',
  Cta: 'ctas',
  Faq: 'faqs',
  Footer: 'footers',
  Hero: 'heros',
  LoginAttempt: 'loginattempts',
  MediaAsset: 'mediaassets',
  PageRelease: 'pagereleases',
  ProcessStep: 'processsteps',
  Review: 'reviews',
  SecurityEvent: 'securityevents',
  Seo: 'seos',
  Service: 'services',
  SiteState: 'sitestates',
  TrustPoint: 'trustpoints',
};
