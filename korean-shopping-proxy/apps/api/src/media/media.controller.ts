import { Body, Controller, Delete, Get, HttpCode, Inject, NotFoundException, Param, Post, Put, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AdminGuard, CurrentAdmin } from '../auth/admin.guard';
import type { AuthenticatedAdmin } from '../auth/auth.service';
import { CsrfGuard } from '../auth/csrf.guard';
import { MediaService } from './media.service';

interface UploadFile { buffer: Buffer; size: number; mimetype: string }

@Controller('media')
export class MediaController {
  constructor(@Inject(MediaService) private readonly media: MediaService) {}

  @Get('files/:key')
  async publicFile(@Param('key') key: string, @Res() response: Response): Promise<void> {
    const file = await this.media.readPublic(key);
    if (!file) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Media file not found.' });
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    response.send(file.bytes);
  }

  @Get()
  @UseGuards(AdminGuard, CsrfGuard)
  list(): Promise<{ items: Record<string, unknown>[] }> { return this.media.list(); }

  @Post()
  @UseGuards(AdminGuard, CsrfGuard)
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file: UploadFile | undefined, @Body('alt') alt: unknown, @CurrentAdmin() admin: AuthenticatedAdmin): Promise<Record<string, unknown>> {
    return this.media.upload(file, alt, admin);
  }

  @Put(':id')
  @UseGuards(AdminGuard, CsrfGuard)
  update(@Param('id') id: string, @Body('alt') alt: unknown): Promise<Record<string, unknown>> { return this.media.updateAlt(id, alt); }

  @Delete('orphans')
  @HttpCode(200)
  @UseGuards(AdminGuard, CsrfGuard)
  cleanup(): Promise<{ removed: number }> { return this.media.cleanupOrphans(); }

  @Delete(':id')
  @HttpCode(200)
  @UseGuards(AdminGuard, CsrfGuard)
  async remove(@Param('id') id: string): Promise<{ ok: true }> { await this.media.remove(id); return { ok: true }; }
}
