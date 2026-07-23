import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { conflictError, validationError } from '../content/content.common';
import { DEFAULT_SECTION_VISIBILITY, OPTIONAL_SECTION_KEYS, type SectionVisibility } from './release.schemas';

interface StateDoc { _id: unknown; sectionVisibilityDraft: SectionVisibility; version: number }

@Injectable()
export class VisibilityService {
  constructor(@InjectModel('SiteState') private readonly states: Model<StateDoc>) {}

  async get(): Promise<{ visibility: SectionVisibility; version: number }> {
    const state = await this.states.findOne().lean<StateDoc>().exec();
    return { visibility: state?.sectionVisibilityDraft ?? { ...DEFAULT_SECTION_VISIBILITY }, version: state?.version ?? 0 };
  }

  async update(body: unknown): Promise<{ visibility: SectionVisibility; version: number }> {
    if (typeof body !== 'object' || body === null || Array.isArray(body)) throw validationError([{ path: [], message: 'body must be an object' }]);
    const values = body as Record<string, unknown>;
    const version = values.version;
    if (!Number.isInteger(version) || (version as number) < 0) throw validationError([{ path: ['version'], message: 'current integer version is required' }]);
    const unknown = Object.keys(values).filter((key) => key !== 'version' && !OPTIONAL_SECTION_KEYS.includes(key as never));
    if (unknown.length) throw validationError(unknown.map((key) => ({ path: [key], message: 'Only optional sections can be changed; hero, cta and footer are always enabled' })));
    const updates: Record<string, boolean> = {};
    for (const key of OPTIONAL_SECTION_KEYS) {
      if (key in values) {
        if (typeof values[key] !== 'boolean') throw validationError([{ path: [key], message: 'must be boolean' }]);
        updates[`sectionVisibilityDraft.${key}`] = values[key] as boolean;
      }
    }
    if (Object.keys(updates).length === 0) throw validationError([{ path: [], message: 'At least one optional section value is required' }]);
    const updated = await this.states.findOneAndUpdate({ version }, { $set: updates, $inc: { version: 1 } }, { new: true }).lean<StateDoc>().exec();
    if (!updated) {
      const current = await this.states.findOne().lean<StateDoc>().exec();
      throw conflictError(current?.version ?? null);
    }
    return { visibility: updated.sectionVisibilityDraft, version: updated.version };
  }
}
