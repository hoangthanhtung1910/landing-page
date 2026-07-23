import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { footerSchema } from '@vyvy/content-types';
import { SingletonContentService } from '../singleton.service';
const input = footerSchema;
@Injectable()
export class FooterService extends SingletonContentService<typeof input._output> {
  constructor(@InjectModel('Footer') model: Model<{ _id: unknown; version: number }>) { super(model, input, 'Footer', ['socials']); }
}
