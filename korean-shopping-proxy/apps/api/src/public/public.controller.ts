import {
  Controller,
  Get,
  Header,
  Inject,
  Req,
  Res,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ReleasesService } from '../releases/releases.service';

/**
 * Public read API (T014). Returns the current published page release as
 * SiteContent — published + enabled sections only (FR-023/FR-034/FR-051) — with
 * a release-number `ETag`. Supports conditional GET (304). Unauthenticated.
 */
@Controller('public')
export class PublicController {
  constructor(@Inject(ReleasesService) private readonly releases: ReleasesService) {}

  @Get('content')
  @Header('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300')
  async getContent(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const content = await this.releases.getCurrentSiteContent();
    if (!content) {
      // Nothing published yet — the web build is fail-closed and must not ship
      // an empty page (FR-030). Signal unavailability rather than an empty body.
      throw new ServiceUnavailableException({
        code: 'NO_PUBLISHED_CONTENT',
        message: 'No published content is available yet.',
      });
    }

    const etag = `"release-${content.meta.releaseNumber}"`;
    if (req.headers['if-none-match'] === etag) {
      res.status(304).setHeader('ETag', etag).end();
      return;
    }

    res.setHeader('ETag', etag);
    res.status(200).json(content);
  }
}
