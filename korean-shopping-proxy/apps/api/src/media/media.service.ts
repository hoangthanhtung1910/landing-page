import { randomUUID } from 'node:crypto';
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type { AuthenticatedAdmin } from '../auth/auth.service';
import { validationError } from '../content/content.common';
import { ReleasesService } from '../releases/releases.service';
import { inspectImage } from './image-inspection';
import { STORAGE_ADAPTER, type StorageAdapter } from './storage';

interface UploadFile { buffer: Buffer; size: number; mimetype: string }
interface MediaDoc { _id: unknown; objectKey: string; url: string; mimeType: string; bytes: number; width?: number; height?: number; alt: string; createdAt?: Date }

@Injectable()
export class MediaService {
  private readonly maxBytes: number;
  private readonly maxDimension: number;
  private readonly allowed: Set<string>;
  private readonly publicBase: string;

  constructor(
    @InjectModel('MediaAsset') private readonly assets: Model<MediaDoc>,
    @Inject(STORAGE_ADAPTER) private readonly storage: StorageAdapter,
    @Inject(ConfigService) config: ConfigService,
    @Inject(ReleasesService) private readonly releases: ReleasesService,
  ) {
    this.maxBytes = config.get<number>('MEDIA_MAX_BYTES') ?? 5_242_880;
    this.maxDimension = config.get<number>('MEDIA_MAX_DIMENSION') ?? 6000;
    this.allowed = new Set((config.get<string>('MEDIA_ALLOWED_MIME') ?? 'image/jpeg,image/png,image/webp').split(','));
    this.publicBase = (config.get<string>('MEDIA_PUBLIC_BASE_URL') ?? 'http://localhost:4000/media/files').replace(/\/$/, '');
  }

  private serialize(doc: MediaDoc): Record<string, unknown> {
    return { id: String(doc._id), url: doc.url, mimeType: doc.mimeType, bytes: doc.bytes, width: doc.width, height: doc.height, alt: doc.alt, createdAt: doc.createdAt };
  }

  async upload(file: UploadFile | undefined, altRaw: unknown, admin: AuthenticatedAdmin): Promise<Record<string, unknown>> {
    const alt = typeof altRaw === 'string' ? altRaw.trim() : '';
    if (!file) throw validationError([{ path: ['file'], message: 'An image file is required' }]);
    if (!alt) throw validationError([{ path: ['alt'], message: 'Non-empty alt text is required' }]);
    if (file.size > this.maxBytes) throw validationError([{ path: ['file'], message: `Image exceeds ${this.maxBytes} bytes` }]);
    const inspected = inspectImage(file.buffer);
    if (!inspected || !this.allowed.has(inspected.mimeType)) {
      throw validationError([{ path: ['file'], message: 'File content is not an allowed PNG, JPEG, or WebP image' }]);
    }
    if (inspected.width < 1 || inspected.height < 1 || inspected.width > this.maxDimension || inspected.height > this.maxDimension) {
      throw validationError([{ path: ['file'], message: `Image dimensions must be between 1 and ${this.maxDimension}px` }]);
    }
    const objectKey = `${randomUUID()}.${inspected.extension}`;
    const url = `${this.publicBase}/${objectKey}`;
    await this.storage.put(objectKey, file.buffer);
    try {
      const created = await this.assets.create({ objectKey, url, mimeType: inspected.mimeType, bytes: file.size, width: inspected.width, height: inspected.height, alt, uploadedBy: admin.userId });
      return this.serialize(created.toObject() as unknown as MediaDoc);
    } catch (error) {
      await this.storage.delete(objectKey);
      throw error;
    }
  }

  async list(): Promise<{ items: Record<string, unknown>[] }> {
    const docs = await this.assets.find().sort({ createdAt: -1 }).lean<MediaDoc[]>().exec();
    return { items: docs.map((doc) => this.serialize(doc)) };
  }

  async updateAlt(id: string, altRaw: unknown): Promise<Record<string, unknown>> {
    const alt = typeof altRaw === 'string' ? altRaw.trim() : '';
    if (!alt) throw validationError([{ path: ['alt'], message: 'Non-empty alt text is required' }]);
    const updated = await this.assets.findByIdAndUpdate(id, { $set: { alt } }, { new: true }).lean<MediaDoc>().exec().catch(() => null);
    if (!updated) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Media asset not found.' });
    return this.serialize(updated);
  }

  async remove(id: string): Promise<void> {
    const asset = await this.assets.findById(id).lean<MediaDoc>().exec().catch(() => null);
    if (!asset) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Media asset not found.' });
    const release = await this.releases.getCurrentRelease();
    if (release && JSON.stringify(release.content).includes(asset.url)) {
      throw new ConflictException({ code: 'CONFLICT', message: 'Media asset is referenced by the current release.' });
    }
    await this.storage.delete(asset.objectKey);
    await this.assets.deleteOne({ _id: asset._id }).exec();
  }

  async readPublic(key: string): Promise<{ bytes: Buffer; mimeType: string } | null> {
    const asset = await this.assets.findOne({ objectKey: key }).lean<MediaDoc>().exec();
    if (!asset) return null;
    const bytes = await this.storage.get(key);
    return bytes ? { bytes, mimeType: asset.mimeType } : null;
  }

  async cleanupOrphans(): Promise<{ removed: number }> {
    const [stored, docs] = await Promise.all([this.storage.list(), this.assets.find().select({ objectKey: 1 }).lean<MediaDoc[]>().exec()]);
    const known = new Set(docs.map((doc) => doc.objectKey));
    const orphaned = stored.filter((key) => !known.has(key));
    await Promise.all(orphaned.map((key) => this.storage.delete(key)));
    return { removed: orphaned.length };
  }
}
