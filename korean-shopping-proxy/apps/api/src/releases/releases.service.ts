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
interface SiteStateDoc { _id: unknown; currentReleaseId?: unknown; previousReleaseId?: unknown; sectionVisibilityDraft: SectionVisibility; version?: number; releaseSequence?: number }
type PublishableSiteState = SiteStateDoc & { version: number; releaseSequence: number }

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

  /**
   * Older local databases predate the optimistic version and monotonic release
   * sequence fields. Backfill only invalid/missing counters with compare-and-set
   * filters so a concurrent request that already repaired them wins safely.
   */
  private async normalizeLegacyState(state: SiteStateDoc): Promise<PublishableSiteState> {
    const validVersion = Number.isSafeInteger(state.version) && (state.version ?? -1) >= 0;
    const validSequence = Number.isSafeInteger(state.releaseSequence) && (state.releaseSequence ?? -1) >= 0;
    if (validVersion && validSequence) return state as PublishableSiteState;

    const latest = await this.releaseModel
      .findOne()
      .sort({ releaseNumber: -1 })
      .select({ releaseNumber: 1 })
      .lean<Pick<PageReleaseDoc, 'releaseNumber'>>()
      .exec();
    const filter: Record<string, unknown> = { _id: state._id };
    const backfill: Record<string, number> = {};

    if (!validVersion) {
      filter.version = state.version === undefined ? { $exists: false } : state.version;
      backfill.version = 0;
    }
    if (!validSequence) {
      filter.releaseSequence =
        state.releaseSequence === undefined ? { $exists: false } : state.releaseSequence;
      backfill.releaseSequence = latest?.releaseNumber ?? 0;
    }

    const repaired = await this.siteStateModel
      .findOneAndUpdate(filter, { $set: backfill }, { new: true })
      .lean<SiteStateDoc>()
      .exec();
    const current =
      repaired ?? await this.siteStateModel.findById(state._id).lean<SiteStateDoc>().exec();
    if (
      !current ||
      !Number.isSafeInteger(current.version) ||
      (current.version ?? -1) < 0 ||
      !Number.isSafeInteger(current.releaseSequence) ||
      (current.releaseSequence ?? -1) < 0
    ) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Legacy release state could not be initialized. Refresh and retry.',
      });
    }
    return current as PublishableSiteState;
  }

  async publish(admin: AuthenticatedAdmin): Promise<Record<string, unknown>> {
    const storedState = await this.siteStateModel.findOne().lean<SiteStateDoc>().exec();
    if (!storedState?.currentReleaseId) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Site state is not initialized.' });
    const state = await this.normalizeLegacyState(storedState);
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
    await this.releaseModel.updateOne({ _id: previous._id }, { $set: { revalidation } }).exec();
    return { id: String(previous._id), releaseNumber: previous.releaseNumber, publishedAt: new Date(previous.publishedAt).toISOString(), revalidation };
  }

  async revalidateCurrent(admin: AuthenticatedAdmin): Promise<Record<string, unknown>> {
    void admin;
    const release = await this.getCurrentRelease();
    if (!release) throw new NotFoundException({ code: 'NOT_FOUND', message: 'No current release.' });
    const revalidation = await this.revalidation.trigger();
    await this.releaseModel.updateOne({ _id: release._id }, { $set: { revalidation } }).exec();
    return {
      id: String(release._id),
      releaseNumber: release.releaseNumber,
      publishedAt: new Date(release.publishedAt).toISOString(),
      revalidation,
    };
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
