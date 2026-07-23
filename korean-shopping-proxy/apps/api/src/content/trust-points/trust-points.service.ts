import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { trustPointSchema } from '@vyvy/content-types';
import { ListContentService } from '../list-content.service';

const trustPointInputSchema = trustPointSchema.omit({ id: true });

@Injectable()
export class TrustPointsService extends ListContentService<
  typeof trustPointInputSchema._output
> {
  constructor(
    @InjectModel('TrustPoint') model: Model<{ _id: unknown; order: number; version: number }>,
    @InjectModel('ContentOrder') orders: Model<{
      _id: string;
      orderedIds: string[];
      version: number;
    }>,
  ) {
    super(model, orders, trustPointInputSchema, 'Trust point', 'trust-points');
  }
}
