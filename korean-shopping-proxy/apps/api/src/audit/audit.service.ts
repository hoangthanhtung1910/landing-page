import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type { AuthenticatedAdmin } from '../auth/auth.service';

export interface AuditInput {
  action: string;
  targetType: string;
  targetId?: string;
  releaseNumber?: number;
  before?: unknown;
  after?: unknown;
}

@Injectable()
export class AuditService {
  constructor(@InjectModel('AuditEvent') private readonly events: Model<Record<string, unknown>>) {}

  async record(admin: AuthenticatedAdmin, input: AuditInput): Promise<void> {
    await this.events.create({
      actor: admin.userId,
      actorUsername: admin.username,
      ...input,
      before: input.before ?? null,
      after: input.after ?? null,
      createdAt: new Date(),
    });
  }

  async list(limit = 100): Promise<{ items: Record<string, unknown>[] }> {
    const items = await this.events
      .find()
      .sort({ createdAt: -1 })
      .limit(Math.min(Math.max(limit, 1), 500))
      .lean<Record<string, unknown>[]>()
      .exec();
    return {
      items: items.map((item) => ({
        id: String(item._id),
        actor: item.actorUsername,
        action: item.action,
        targetType: item.targetType,
        targetId: item.targetId,
        releaseNumber: item.releaseNumber,
        before: item.before,
        after: item.after,
        createdAt: item.createdAt,
      })),
    };
  }
}
