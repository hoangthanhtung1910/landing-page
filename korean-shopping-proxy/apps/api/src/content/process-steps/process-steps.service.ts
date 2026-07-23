import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { processStepSchema } from '@vyvy/content-types';
import { ListContentService } from '../list-content.service';

const processStepInputSchema = processStepSchema.omit({ id: true, order: true });

@Injectable()
export class ProcessStepsService extends ListContentService<
  typeof processStepInputSchema._output
> {
  constructor(
    @InjectModel('ProcessStep') model: Model<{ _id: unknown; order: number; version: number }>,
    @InjectModel('ContentOrder') orders: Model<{
      _id: string;
      orderedIds: string[];
      version: number;
    }>,
  ) {
    super(model, orders, processStepInputSchema, 'Process step', 'process-steps', ['icon']);
  }
}
