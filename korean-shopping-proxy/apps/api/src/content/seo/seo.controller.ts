import { Body, Controller, Get, Inject, Put, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../auth/admin.guard';
import { CsrfGuard } from '../../auth/csrf.guard';
import { SeoService } from './seo.service';

/** SEO admin CRUD (T025c). Singleton: detail + update. */
@Controller('content/seo')
@UseGuards(AdminGuard, CsrfGuard)
export class SeoController {
  constructor(@Inject(SeoService) private readonly seo: SeoService) {}

  @Get()
  get(): Promise<Record<string, unknown>> {
    return this.seo.get();
  }

  @Put()
  update(@Body() body: unknown): Promise<Record<string, unknown>> {
    return this.seo.update(body);
  }
}
