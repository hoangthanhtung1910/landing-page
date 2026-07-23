import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { siteContentSchema, type SiteContent } from '@vyvy/content-types';
import type { AuthenticatedAdmin } from '../auth/auth.service';
import { validationError } from '../content/content.common';
import { ReleaseAssemblerService } from './release-assembler.service';
import { OPTIONAL_SECTION_KEYS, type OptionalSectionKey, type SectionVisibility } from './release.schemas';
import { RevalidationService, type RevalidationResult } from './revalidation.service';
import { normalizeLegacySeedMedia } from './legacy-seed-media';

interface PageReleaseDoc { _id: unknown; releaseNumber: number; sectionVisibility: SectionVisibility; content: Omit<SiteContent, 'meta'>; publishedBy?: unknown; publishedAt: Date; revalidation?: RevalidationResult }
interface SiteStateDoc { _id: unknown; currentReleaseId?: unknown; previousReleaseId?: unknown; sectionVisibilityDraft: SectionVisibility; version: number; releaseSequence: number }

@Injectable()
export class ReleasesService {
  constructor(
    @InjectModel('PageRelease') private readonly releaseModel: Model<PageReleaseDoc>,
    @InjectModel('SiteState') private readonly siteStateModel: Model<SiteStateDoc>,
    @Inject(ReleaseAssemblerService) private readonly assembler: ReleaseAssemblerService,
    @Inject(RevalidationService) private readonly revalidation: RevalidationService,
  ) {}

  async getCurrentRelease(): Promise<PageReleaseDoc | null> {
    const state = await this.siteStateModel.findOne().lean<SiteStateDoc>().exec();
    if (!state?.currentReleaseId) return null;
    return this.releaseModel.findById(state.currentReleaseId).lean<PageReleaseDoc>().exec();
  }

  async getCurrentSiteContent(): Promise<SiteContent | null> {
    const release = await this.getCurrentRelease();
    if (!release) return null;
    const content = { ...release.content } as Omit<SiteContent, 'meta'> & Record<string, unknown>;
    for (const key of OPTIONAL_SECTION_KEYS) if (!release.sectionVisibility[key as OptionalSectionKey]) delete content[key];
    const normalized = normalizeLegacySeedMedia(content as Omit<SiteContent, 'meta'>);
    return { ...normalized, meta: { releaseNumber: release.releaseNumber, publishedAt: new Date(release.publishedAt).toISOString() } };
  }

  private validateCandidate(candidate: unknown): asserts candidate is SiteContent {
    const result = siteContentSchema.safeParse(candidate);
    if (!result.success) throw validationError(result.error.issues.map((issue) => ({ path: issue.path, message: issue.message })));
    if (result.data.categories) {
      const names = result.data.categories.map((item) => item.name.toLocaleLowerCase('vi'));
      const required = [
        { label: 'mỹ phẩm', matches: ['mỹ phẩm', 'beauty'] },
        { label: 'thời trang', matches: ['thời trang', 'fashion'] },
        { label: 'điện tử', matches: ['điện tử', 'công nghệ', 'tech'] },
        { label: 'K-pop', matches: ['k-pop', 'kpop'] },
      ];
      const missing = required.filter((entry) => !names.some((name) => entry.matches.some((match) => name.includes(match))));
      if (missing.length) throw validationError(missing.map((entry) => ({ path: ['categories'], message: `Enabled categories must include ${entry.label}` })));
    }
  }

  async publish(admin: AuthenticatedAdmin): Promise<Record<string, unknown>> {
    const state = await this.siteStateModel.findOne().lean<SiteStateDoc>().exec();
    if (!state?.currentReleaseId) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Site state is not initialized.' });
    const publishedAt = new Date();
    const content = await this.assembler.assemble(state.sectionVisibilityDraft);
    this.validateCandidate({ ...content, meta: { releaseNumber: state.releaseSequence + 1, publishedAt: publishedAt.toISOString() } });

    const sequence = await this.siteStateModel.findOneAndUpdate(
      { _id: state._id, currentReleaseId: state.currentReleaseId, version: state.version },
      { $inc: { releaseSequence: 1 } },
      { new: true },
    ).lean<SiteStateDoc>().exec();
    if (!sequence) throw new ConflictException({ code: 'CONFLICT', message: 'Site state changed while publishing. Refresh and retry.' });

    const release = await this.releaseModel.create({ releaseNumber: sequence.releaseSequence, sectionVisibility: state.sectionVisibilityDraft, content, publishedBy: admin.userId, publishedAt });
    const advanced = await this.siteStateModel.findOneAndUpdate(
      { _id: state._id, currentReleaseId: state.currentReleaseId, version: state.version },
      { $set: { previousReleaseId: state.currentReleaseId, currentReleaseId: release._id }, $inc: { version: 1 } },
      { new: true },
    ).exec();
    if (!advanced) {
      await this.releaseModel.deleteOne({ _id: release._id }).exec();
      throw new ConflictException({ code: 'CONFLICT', message: 'Another publish or visibility change won. The live release was not overwritten.' });
    }
    await this.assembler.markPublished();
    const revalidation = await this.revalidation.trigger();
    await this.releaseModel.updateOne({ _id: release._id }, { $set: { revalidation } }).exec();
    return { id: String(release._id), releaseNumber: release.releaseNumber, publishedAt: release.publishedAt.toISOString(), revalidation };
  }

  async rollback(admin: AuthenticatedAdmin): Promise<Record<string, unknown>> {
    void admin;
    const state = await this.siteStateModel.findOne().lean<SiteStateDoc>().exec();
    if (!state?.currentReleaseId || !state.previousReleaseId) throw new ConflictException({ code: 'CONFLICT', message: 'No previous release is available for rollback.' });
    const previous = await this.releaseModel.findById(state.previousReleaseId).lean<PageReleaseDoc>().exec();
    if (!previous) throw new ConflictException({ code: 'CONFLICT', message: 'Previous release no longer exists.' });
    const updated = await this.siteStateModel.findOneAndUpdate(
      { _id: state._id, currentReleaseId: state.currentReleaseId, previousReleaseId: state.previousReleaseId, version: state.version },
      { $set: { currentReleaseId: state.previousReleaseId, previousReleaseId: state.currentReleaseId }, $inc: { version: 1 } },
      { new: true },
    ).exec();
    if (!updated) throw new ConflictException({ code: 'CONFLICT', message: 'Release state changed while rolling back.' });
    const revalidation = await this.revalidation.trigger();
    return { id: String(previous._id), releaseNumber: previous.releaseNumber, publishedAt: new Date(previous.publishedAt).toISOString(), revalidation };
  }

  async list(): Promise<{ items: Record<string, unknown>[] }> {
    const [state, releases] = await Promise.all([this.siteStateModel.findOne().lean<SiteStateDoc>().exec(), this.releaseModel.find().sort({ releaseNumber: -1 }).limit(50).lean<PageReleaseDoc[]>().exec()]);
    return { items: releases.map((release) => ({ id: String(release._id), releaseNumber: release.releaseNumber, publishedAt: new Date(release.publishedAt).toISOString(), current: String(release._id) === String(state?.currentReleaseId), previous: String(release._id) === String(state?.previousReleaseId), revalidation: release.revalidation })) };
  }

  async currentSummary(): Promise<Record<string, unknown>> {
    const release = await this.getCurrentRelease();
    if (!release) throw new NotFoundException({ code: 'NOT_FOUND', message: 'No current release.' });
    return { id: String(release._id), releaseNumber: release.releaseNumber, publishedAt: new Date(release.publishedAt).toISOString(), sectionVisibility: release.sectionVisibility, revalidation: release.revalidation };
  }
}
