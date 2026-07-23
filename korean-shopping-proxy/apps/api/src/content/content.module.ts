import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { contentModels } from './schemas';
import { HeroService } from './hero/hero.service';
import { HeroController } from './hero/hero.controller';
import { SeoService } from './seo/seo.service';
import { SeoController } from './seo/seo.controller';
import { ContactService } from './contact/contact.service';
import { ContactController } from './contact/contact.controller';
import { ServicesService } from './services/services.service';
import { ServicesController } from './services/services.controller';
import { TrustPointsService } from './trust-points/trust-points.service';
import { TrustPointsController } from './trust-points/trust-points.controller';
import { ProcessStepsService } from './process-steps/process-steps.service';
import { ProcessStepsController } from './process-steps/process-steps.controller';
import { CategoriesService } from './categories/categories.service';
import { CategoriesController } from './categories/categories.controller';
import { ReviewsService } from './reviews/reviews.service';
import { ReviewsController } from './reviews/reviews.controller';
import { FaqService } from './faq/faq.service';
import { FaqController } from './faq/faq.controller';
import { BrandService } from './brand/brand.service';
import { BrandController } from './brand/brand.controller';
import { CtaService } from './cta/cta.service';
import { CtaController } from './cta/cta.controller';
import { FooterService } from './footer/footer.service';
import { FooterController } from './footer/footer.controller';

/**
 * Registers the editable per-section content collections (T011–T013) and the
 * admin CRUD surface. T025 wires hero/contact/seo and T026 wires services,
 * trust-points, and process-steps; T027 adds the remaining list sections. `AuthModule` supplies the
 * `AdminGuard`/`CsrfGuard` that protect every write route. The public serving path
 * reads the assembled page release (ReleasesModule), not these collections.
 */
@Module({
  imports: [MongooseModule.forFeature(contentModels), AuthModule],
  controllers: [
    HeroController,
    SeoController,
    ContactController,
    ServicesController,
    TrustPointsController,
    ProcessStepsController,
    CategoriesController,
    ReviewsController,
    FaqController,
    BrandController,
    CtaController,
    FooterController,
  ],
  providers: [
    HeroService,
    SeoService,
    ContactService,
    ServicesService,
    TrustPointsService,
    ProcessStepsService,
    CategoriesService,
    ReviewsService,
    FaqService,
    BrandService,
    CtaService,
    FooterService,
  ],
  exports: [MongooseModule],
})
export class ContentModule {}
