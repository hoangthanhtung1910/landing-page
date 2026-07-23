import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { z } from 'zod';
import { customerReviewSchema } from '@vyvy/content-types';
import { ListContentService } from '../list-content.service';

const reviewInputSchema = customerReviewSchema
  .omit({ id: true })
  .extend({
    approved: z.boolean(),
    consentGiven: z.boolean(),
  })
  .superRefine((review, context) => {
    if (review.approved && !review.consentGiven) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['consentGiven'],
        message: 'consentGiven must be true before a customer review can be approved',
      });
    }
  });

@Injectable()
export class ReviewsService extends ListContentService<typeof reviewInputSchema._output> {
  constructor(
    @InjectModel('Review') model: Model<{ _id: unknown; order: number; version: number }>,
    @InjectModel('ContentOrder') orders: Model<{
      _id: string;
      orderedIds: string[];
      version: number;
    }>,
  ) {
    super(model, orders, reviewInputSchema, 'Review', 'reviews', [
      'rating',
      'location',
      'avatar',
    ]);
  }
}
