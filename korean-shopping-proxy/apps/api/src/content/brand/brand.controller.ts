import { Body, Controller, Get, Inject, Put, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../auth/admin.guard';
import { CsrfGuard } from '../../auth/csrf.guard';
import { BrandService } from './brand.service';
@Controller('content/brand') @UseGuards(AdminGuard, CsrfGuard)
export class BrandController {
  constructor(@Inject(BrandService) private readonly service: BrandService) {}
  @Get() get() { return this.service.get(); }
  @Put() update(@Body() body: unknown) { return this.service.update(body); }
}
