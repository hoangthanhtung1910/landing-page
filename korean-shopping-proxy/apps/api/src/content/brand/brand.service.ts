import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { brandSchema } from '@vyvy/content-types';
import { SingletonContentService } from '../singleton.service';

const input = brandSchema;
@Injectable()
export class BrandService extends SingletonContentService<typeof input._output> {
  constructor(@InjectModel('Brand') model: Model<{ _id: unknown; version: number }>) { super(model, input, 'Brand', ['tagline', 'logo']); }
}
