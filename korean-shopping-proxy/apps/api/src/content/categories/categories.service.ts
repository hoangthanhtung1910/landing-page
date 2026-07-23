import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { productCategorySchema } from '@vyvy/content-types';
import { ListContentService } from '../list-content.service';

const categoryInputSchema = productCategorySchema.omit({ id: true });

@Injectable()
export class CategoriesService extends ListContentService<typeof categoryInputSchema._output> {
  constructor(
    @InjectModel('Category') model: Model<{ _id: unknown; order: number; version: number }>,
    @InjectModel('ContentOrder') orders: Model<{
      _id: string;
      orderedIds: string[];
      version: number;
    }>,
  ) {
    super(model, orders, categoryInputSchema, 'Category', 'categories', ['blurb']);
  }
}
