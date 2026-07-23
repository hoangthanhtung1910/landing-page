import { Body, Controller, Get, Inject, Put, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../auth/admin.guard';
import { CsrfGuard } from '../../auth/csrf.guard';
import { CtaService } from './cta.service';
@Controller('content/cta') @UseGuards(AdminGuard, CsrfGuard)
export class CtaController {
  constructor(@Inject(CtaService) private readonly service: CtaService) {}
  @Get() get() { return this.service.get(); }
  @Put() update(@Body() body: unknown) { return this.service.update(body); }
}
