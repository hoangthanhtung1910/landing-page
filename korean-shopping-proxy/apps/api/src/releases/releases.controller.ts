import { Controller, Get, Inject, Post, UseGuards } from '@nestjs/common';
import { AdminGuard, CurrentAdmin } from '../auth/admin.guard';
import type { AuthenticatedAdmin } from '../auth/auth.service';
import { CsrfGuard } from '../auth/csrf.guard';
import { ReleasesService } from './releases.service';

@Controller()
@UseGuards(AdminGuard, CsrfGuard)
export class ReleasesController {
  constructor(@Inject(ReleasesService) private readonly releases: ReleasesService) {}
  @Post('publish') publish(@CurrentAdmin() admin: AuthenticatedAdmin) { return this.releases.publish(admin); }
  @Post('rollback') rollback(@CurrentAdmin() admin: AuthenticatedAdmin) { return this.releases.rollback(admin); }
  @Get('releases') list() { return this.releases.list(); }
  @Get('releases/current') current() { return this.releases.currentSummary(); }
}
