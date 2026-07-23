import { Body, Controller, Get, Inject, Put, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../auth/admin.guard';
import { CsrfGuard } from '../../auth/csrf.guard';
import { FooterService } from './footer.service';
@Controller('content/footer') @UseGuards(AdminGuard, CsrfGuard)
export class FooterController {
  constructor(@Inject(FooterService) private readonly service: FooterService) {}
  @Get() get() { return this.service.get(); }
  @Put() update(@Body() body: unknown) { return this.service.update(body); }
}
