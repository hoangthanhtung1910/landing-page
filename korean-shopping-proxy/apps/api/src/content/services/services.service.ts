import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { serviceOfferingSchema } from '@vyvy/content-types';
import { ListContentService } from '../list-content.service';

const serviceInputSchema = serviceOfferingSchema.omit({ id: true });

@Injectable()
export class ServicesService extends ListContentService<
  typeof serviceInputSchema._output
> {
  constructor(
    @InjectModel('Service') model: Model<{ _id: unknown; order: number; version: number }>,
    @InjectModel('ContentOrder') orders: Model<{
      _id: string;
      orderedIds: string[];
      version: number;
    }>,
  ) {
    super(model, orders, serviceInputSchema, 'Service', 'services');
  }
}
