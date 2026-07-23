import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../auth/admin.guard';
import { CsrfGuard } from '../../auth/csrf.guard';
import { validationError } from '../content.common';
import { ServicesService } from './services.service';

@Controller('content/services')
@UseGuards(AdminGuard, CsrfGuard)
export class ServicesController {
  constructor(@Inject(ServicesService) private readonly service: ServicesService) {}

  @Get()
  list(): Promise<Record<string, unknown>[]> { return this.service.list(); }

  @Get('order')
  getOrder(): Promise<{ orderedIds: string[]; version: number }> { return this.service.getOrder(); }

  @Get(':id')
  get(@Param('id') id: string): Promise<Record<string, unknown>> { return this.service.get(id); }

  @Post()
  create(@Body() body: unknown): Promise<Record<string, unknown>> { return this.service.create(body); }

  @Post('reorder')
  @HttpCode(200)
  reorder(@Body() body: unknown): Promise<Record<string, unknown>[]> { return this.service.reorder(body); }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: unknown): Promise<Record<string, unknown>> {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(@Param('id') id: string, @Query('version') version?: string): Promise<{ ok: true }> {
    const parsed = Number(version);
    if (version === undefined || !Number.isInteger(parsed) || parsed < 0) {
      throw validationError([{ path: ['version'], message: 'version query param (current integer) is required' }]);
    }
    await this.service.remove(id, parsed);
    return { ok: true };
  }
}
