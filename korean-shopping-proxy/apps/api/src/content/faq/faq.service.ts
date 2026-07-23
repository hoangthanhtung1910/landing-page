import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { faqItemSchema } from '@vyvy/content-types';
import { ListContentService } from '../list-content.service';

const faqInputSchema = faqItemSchema.omit({ id: true, order: true });

@Injectable()
export class FaqService extends ListContentService<typeof faqInputSchema._output> {
  constructor(
    @InjectModel('Faq') model: Model<{ _id: unknown; order: number; version: number }>,
    @InjectModel('ContentOrder') orders: Model<{
      _id: string;
      orderedIds: string[];
      version: number;
    }>,
  ) {
    super(model, orders, faqInputSchema, 'FAQ item', 'faq');
  }
}
