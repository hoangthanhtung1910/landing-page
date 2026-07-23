import { Schema } from 'mongoose';

export const AuditEventSchema = new Schema({
  actor: { type: Schema.Types.ObjectId, ref: 'AdminUser', required: true, index: true },
  actorUsername: { type: String, required: true },
  action: { type: String, required: true, index: true },
  targetType: { type: String, required: true },
  targetId: String,
  releaseNumber: Number,
  before: { type: Schema.Types.Mixed, default: null },
  after: { type: Schema.Types.Mixed, default: null },
  createdAt: { type: Date, default: Date.now, index: true },
});

export const auditModels = [{ name: 'AuditEvent', schema: AuditEventSchema }];
