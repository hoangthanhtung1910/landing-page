import { Schema } from 'mongoose';

/**
 * Back-office admin accounts (single `administrator` role in v1). The password is
 * stored only as a hash; `enabled: false` blocks authentication (FR-038).
 * Seeded initial admin is created in T015; auth logic lands in T024.
 */
export const AdminUserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const userModels = [{ name: 'AdminUser', schema: AdminUserSchema }];
