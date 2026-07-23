import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../auth/admin.guard';
import { CsrfGuard } from '../../auth/csrf.guard';
import { validationError } from '../content.common';
import { ContactService } from './contact.service';

/**
 * Contact-channel admin CRUD + reorder (T025c). List type. AdminGuard-protected;
 * all writes CSRF-checked. `PUT`/`DELETE` carry the current `version` for optimistic
 * concurrency (`DELETE` via `?version=`).
 */
@Controller('content/contact')
@UseGuards(AdminGuard, CsrfGuard)
export class ContactController {
  constructor(@Inject(ContactService) private readonly contact: ContactService) {}

  @Get()
  list(): Promise<Record<string, unknown>[]> {
    return this.contact.list();
  }

  /** Current ordering + `version` — echo the version back in `POST reorder`. */
  @Get('order')
  getOrder(): Promise<{ orderedIds: string[]; version: number }> {
    return this.contact.getOrder();
  }

  @Post()
  create(@Body() body: unknown): Promise<Record<string, unknown>> {
    return this.contact.create(body);
  }

  /** Body: `{ orderedIds: string[], orderVersion: number }` — `409` on a stale ordering. */
  @Post('reorder')
  @HttpCode(200)
  reorder(@Body() body: unknown): Promise<Record<string, unknown>[]> {
    return this.contact.reorder(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: unknown): Promise<Record<string, unknown>> {
    return this.contact.update(id, body);
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(@Param('id') id: string, @Query('version') version?: string): Promise<{ ok: true }> {
    const v = Number(version);
    if (version === undefined || !Number.isInteger(v) || v < 0) {
      throw validationError([{ path: ['version'], message: 'version query param (current integer) is required' }]);
    }
    await this.contact.remove(id, v);
    return { ok: true };
  }
}
