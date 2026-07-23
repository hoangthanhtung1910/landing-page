import { Schema } from 'mongoose';
import { COLLECTION_NAMES } from '../database/collection-names';

/**
 * Server-side admin session (T024). The random `_id` is the opaque token carried
 * in the `HttpOnly` session cookie; the server is the source of truth so logout
 * and account-disable revoke immediately (no JWT-in-JS). A TTL index expires
 * sessions at `expiresAt`; the guard also checks expiry/`revokedAt` defensively
 * because TTL cleanup is not instantaneous (FR-025, FR-038).
 */
export const AdminSessionSchema = new Schema(
  {
    _id: { type: String }, // opaque random session id
    userId: { type: Schema.Types.ObjectId, ref: 'AdminUser', required: true },
    username: { type: String, required: true },
    csrfToken: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true, _id: false },
);
// Auto-expire sessions once past `expiresAt`.
AdminSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * Per-username login throttle (T024B). `_id` is the lowercased username so
 * failure counting/lockout is a single atomic upsert. `lockedUntil` in the future
 * means authentication is refused with `429` regardless of credentials (FR-038).
 */
export const LoginAttemptSchema = new Schema(
  {
    _id: { type: String }, // lowercased username
    fails: { type: Number, default: 0 },
    windowStart: { type: Date, default: null },
    lockedUntil: { type: Date, default: null },
  },
  { timestamps: true, _id: false },
);

/**
 * Security-event log (T024B, FR-038): append-only record of auth-relevant actions
 * (login success/failure, lockout, logout, session revocation, password change).
 * Distinct from the content/publish audit log (T029D).
 */
export const SecurityEventSchema = new Schema({
  type: { type: String, required: true, index: true },
  username: { type: String, default: null },
  ip: { type: String, default: null },
  detail: { type: Schema.Types.Mixed, default: null },
  at: { type: Date, default: Date.now, index: true },
});

export const authModels = [
  { name: 'AdminSession', schema: AdminSessionSchema, collection: COLLECTION_NAMES.AdminSession },
  { name: 'LoginAttempt', schema: LoginAttemptSchema, collection: COLLECTION_NAMES.LoginAttempt },
  { name: 'SecurityEvent', schema: SecurityEventSchema, collection: COLLECTION_NAMES.SecurityEvent },
];
