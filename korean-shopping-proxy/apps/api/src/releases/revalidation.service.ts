import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface RevalidationResult { status: 'skipped' | 'succeeded' | 'failed'; attempts: number; latencyMs: number; error?: string }

@Injectable()
export class RevalidationService {
  private readonly logger = new Logger(RevalidationService.name);
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  async trigger(): Promise<RevalidationResult> {
    const url = this.config.get<string>('WEB_REVALIDATE_URL');
    const secret = this.config.get<string>('REVALIDATE_SECRET');
    if (!url || !secret) return { status: 'skipped', attempts: 0, latencyMs: 0 };
    const retries = this.config.get<number>('REVALIDATE_RETRIES') ?? 2;
    const started = Date.now();
    let lastError = '';
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'x-revalidate-secret': secret },
          signal: AbortSignal.timeout(3000),
        });
        if (response.ok) return { status: 'succeeded', attempts: attempt, latencyMs: Date.now() - started };
        lastError = `HTTP ${response.status}`;
      } catch (error) { lastError = (error as Error).message; }
      if (attempt <= retries) await new Promise((resolve) => setTimeout(resolve, 100 * 3 ** (attempt - 1)));
    }
    this.logger.warn(`web revalidation failed after ${retries + 1} attempts: ${lastError}`);
    return { status: 'failed', attempts: retries + 1, latencyMs: Date.now() - started, error: lastError };
  }
}
