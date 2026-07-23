import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { heroSchema, type Hero } from '@vyvy/content-types';
import { SingletonContentService } from '../singleton.service';

/**
 * Hero §1 admin service (T025b). Validates input against the shared `heroSchema`
 * (structural checks: single headline/subheadline, a valid CtaRef). Cross-field
 * rules (primary must be a contact CTA, referenced channels must exist) are
 * enforced page-wide at publish (T029), not on a draft edit.
 */
@Injectable()
export class HeroService extends SingletonContentService<Hero> {
  constructor(@InjectModel('Hero') model: Model<{ _id: unknown; version: number }>) {
    super(model, heroSchema, 'Hero', ['secondaryCta', 'media']);
  }
}
