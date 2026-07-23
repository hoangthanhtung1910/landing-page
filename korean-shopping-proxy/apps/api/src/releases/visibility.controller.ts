import { Body, Controller, Get, Inject, Put, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { CsrfGuard } from '../auth/csrf.guard';
import { VisibilityService } from './visibility.service';

@Controller('sections/visibility')
@UseGuards(AdminGuard, CsrfGuard)
export class VisibilityController {
  constructor(@Inject(VisibilityService) private readonly visibility: VisibilityService) {}
  @Get() get() { return this.visibility.get(); }
  @Put() update(@Body() body: unknown) { return this.visibility.update(body); }
}
