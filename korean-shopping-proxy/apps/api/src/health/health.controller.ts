import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import type { Connection, Model } from 'mongoose';

@Controller()
export class HealthController {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel('PageRelease') private readonly releases: Model<Record<string, unknown>>,
  ) {}

  @Get('health')
  health() { return { status: 'ok', service: 'vyvy-cms-api', timestamp: new Date().toISOString() }; }

  @Get('ready')
  async ready() {
    if (this.connection.readyState !== 1 || !this.connection.db) throw new ServiceUnavailableException({ code: 'NOT_READY', message: 'MongoDB is not ready.' });
    await this.connection.db.admin().ping();
    return { status: 'ready', database: 'connected', timestamp: new Date().toISOString() };
  }

  @Get('health/publishing')
  async publishing() {
    const [total, failed, last] = await Promise.all([
      this.releases.countDocuments(),
      this.releases.countDocuments({ 'revalidation.status': 'failed' }),
      this.releases.findOne().sort({ releaseNumber: -1 }).select({ releaseNumber: 1, publishedAt: 1, revalidation: 1 }).lean().exec(),
    ]);
    return { status: failed > 0 ? 'degraded' : 'ok', totalReleases: total, revalidationFailures: failed, latest: last ?? null };
  }
}
