import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { seoSchema, type Seo } from '@vyvy/content-types';
import { SingletonContentService } from '../singleton.service';

/**
 * SEO admin service (T025b). Validates against the shared `seoSchema`
 * (title/description required, canonical is an absolute URL, ogImage alt, etc.).
 */
@Injectable()
export class SeoService extends SingletonContentService<Seo> {
  constructor(@InjectModel('Seo') model: Model<{ _id: unknown; version: number }>) {
    super(model, seoSchema, 'Seo', ['canonical', 'ogImage', 'ogFields', 'twitterFields']);
  }
}
