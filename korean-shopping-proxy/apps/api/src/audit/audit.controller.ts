import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { CsrfGuard } from '../auth/csrf.guard';
import { AuditService } from './audit.service';

@Controller('audit')
@UseGuards(AdminGuard, CsrfGuard)
export class AuditController {
  constructor(@Inject(AuditService) private readonly audit: AuditService) {}

  @Get()
  list(@Query('limit') raw?: string): Promise<{ items: Record<string, unknown>[] }> {
    const limit = raw && /^\d+$/.test(raw) ? Number(raw) : 100;
    return this.audit.list(limit);
  }
}
