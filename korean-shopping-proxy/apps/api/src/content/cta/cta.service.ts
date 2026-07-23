import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { contactCTASchema } from '@vyvy/content-types';
import { SingletonContentService } from '../singleton.service';
const input = contactCTASchema;
@Injectable()
export class CtaService extends SingletonContentService<typeof input._output> {
  constructor(@InjectModel('Cta') model: Model<{ _id: unknown; version: number }>) { super(model, input, 'Contact CTA', ['subtext']); }
}
