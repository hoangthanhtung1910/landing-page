import { Body, Controller, Get, Inject, Put, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../auth/admin.guard';
import { CsrfGuard } from '../../auth/csrf.guard';
import { HeroService } from './hero.service';

/** Hero §1 admin CRUD (T025c). Singleton: detail + update. AdminGuard-protected; writes CSRF-checked. */
@Controller('content/hero')
@UseGuards(AdminGuard, CsrfGuard)
export class HeroController {
  constructor(@Inject(HeroService) private readonly hero: HeroService) {}

  @Get()
  get(): Promise<Record<string, unknown>> {
    return this.hero.get();
  }

  @Put()
  update(@Body() body: unknown): Promise<Record<string, unknown>> {
    return this.hero.update(body);
  }
}
