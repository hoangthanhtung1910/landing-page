import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const STORAGE_ADAPTER = Symbol('STORAGE_ADAPTER');

export interface StorageAdapter {
  put(key: string, bytes: Buffer): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
  list(): Promise<string[]>;
}

@Injectable()
export class LocalStorageAdapter implements StorageAdapter {
  private readonly directory: string;

  constructor(@Inject(ConfigService) config: ConfigService) {
    this.directory = config.get<string>('STORAGE_LOCAL_DIR') ?? './storage/media';
  }

  private path(key: string): string {
    if (!/^[a-f0-9-]+\.(png|jpg|webp)$/.test(key)) throw new Error('Unsafe media key.');
    return join(this.directory, key);
  }

  async put(key: string, bytes: Buffer): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    await writeFile(this.path(key), bytes, { flag: 'wx' });
  }

  async get(key: string): Promise<Buffer | null> {
    try { return await readFile(this.path(key)); } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try { await unlink(this.path(key)); } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }

  async list(): Promise<string[]> {
    try { return await readdir(this.directory); } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  }
}

/** Placeholder showing the adapter boundary; production can replace this with AWS SDK calls. */
export class S3StorageAdapter implements StorageAdapter {
  private unavailable(): never { throw new Error('S3 adapter is not configured in this v1 build.'); }
  put(): Promise<void> { return this.unavailable(); }
  get(): Promise<Buffer | null> { return this.unavailable(); }
  delete(): Promise<void> { return this.unavailable(); }
  list(): Promise<string[]> { return this.unavailable(); }
}
