import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type { CtaRef, ContactChannelType, SiteContentBody } from '@vyvy/content-types';
import type { SectionVisibility } from './release.schemas';

type Doc = Record<string, unknown> & { _id: unknown };
interface OrderDoc { _id: string; orderedIds: string[] }

@Injectable()
export class ReleaseAssemblerService {
  constructor(
    @InjectModel('Brand') private readonly brands: Model<Doc>,
    @InjectModel('Hero') private readonly heroes: Model<Doc>,
    @InjectModel('Cta') private readonly ctas: Model<Doc>,
    @InjectModel('Footer') private readonly footers: Model<Doc>,
    @InjectModel('Seo') private readonly seoRecords: Model<Doc>,
    @InjectModel('Service') private readonly services: Model<Doc>,
    @InjectModel('TrustPoint') private readonly trustPoints: Model<Doc>,
    @InjectModel('ProcessStep') private readonly processSteps: Model<Doc>,
    @InjectModel('Category') private readonly categories: Model<Doc>,
    @InjectModel('Review') private readonly reviews: Model<Doc>,
    @InjectModel('Faq') private readonly faq: Model<Doc>,
    @InjectModel('ContactChannel') private readonly contacts: Model<Doc>,
    @InjectModel('ContentOrder') private readonly orders: Model<OrderDoc>,
  ) {}

  private async singleton(model: Model<Doc>): Promise<Doc> {
    return (await model.findOne().lean<Doc>().exec()) ?? ({} as Doc);
  }

  private async ordered(model: Model<Doc>, key: string): Promise<Doc[]> {
    const [docs, order] = await Promise.all([
      model.find().sort({ order: 1, _id: 1 }).lean<Doc[]>().exec(),
      this.orders.findById(key).lean<OrderDoc>().exec(),
    ]);
    if (!order) return docs;
    const rank = new Map(order.orderedIds.map((id, index) => [id, index]));
    return docs.sort((a, b) => (rank.get(String(a._id)) ?? Number.MAX_SAFE_INTEGER) - (rank.get(String(b._id)) ?? Number.MAX_SAFE_INTEGER));
  }

  async assemble(visibility: SectionVisibility): Promise<SiteContentBody> {
    const [brand, hero, cta, footer, seo, services, trust, steps, categories, reviews, faq, contacts] = await Promise.all([
      this.singleton(this.brands), this.singleton(this.heroes), this.singleton(this.ctas),
      this.singleton(this.footers), this.singleton(this.seoRecords),
      this.ordered(this.services, 'services'), this.ordered(this.trustPoints, 'trust-points'),
      this.ordered(this.processSteps, 'process-steps'), this.ordered(this.categories, 'categories'),
      this.ordered(this.reviews, 'reviews'), this.ordered(this.faq, 'faq'), this.ordered(this.contacts, 'contact'),
    ]);

    const body: SiteContentBody = {
      brand: { name: brand.name as string, slogan: brand.slogan as string, tagline: brand.tagline as string | undefined, logo: brand.logo as SiteContentBody['brand']['logo'] },
      hero: { headline: hero.headline as string, subheadline: hero.subheadline as string, primaryCta: hero.primaryCta as CtaRef, secondaryCta: hero.secondaryCta as CtaRef | undefined, media: hero.media as SiteContentBody['hero']['media'] },
      cta: { headline: cta.headline as string, subtext: cta.subtext as string | undefined, channels: cta.channels as CtaRef[] },
      footer: { contactSummary: footer.contactSummary as string, links: footer.links as SiteContentBody['footer']['links'], socials: footer.socials as SiteContentBody['footer']['socials'], copyright: footer.copyright as string },
      contact: contacts.map((item) => ({ type: item.type as ContactChannelType, label: item.label as string, handle: item.handle as string, icon: item.icon as string, external: item.external as boolean })),
      seo: { title: seo.title as string, description: seo.description as string, canonical: seo.canonical as string | undefined, ogImage: seo.ogImage as SiteContentBody['seo']['ogImage'], ogFields: seo.ogFields as Record<string, string> | undefined, twitterFields: seo.twitterFields as Record<string, string> | undefined },
    };

    if (visibility.services) body.services = services.map((item) => ({ id: String(item._id), title: item.title as string, description: item.description as string, icon: item.icon as string }));
    if (visibility.trustPoints) body.trustPoints = trust.map((item) => ({ id: String(item._id), title: item.title as string, description: item.description as string, icon: item.icon as string }));
    if (visibility.processSteps) body.processSteps = steps.map((item, index) => ({ id: String(item._id), order: index + 1, title: item.title as string, description: item.description as string, icon: item.icon as string | undefined }));
    if (visibility.categories) body.categories = categories.map((item) => ({ id: String(item._id), name: item.name as string, image: item.image as SiteContentBody['categories'] extends Array<infer T> ? T extends { image: infer I } ? I : never : never, blurb: item.blurb as string | undefined }));
    if (visibility.reviews) body.reviews = reviews.filter((item) => item.approved === true && item.consentGiven === true).map((item) => ({ id: String(item._id), name: item.name as string, text: item.text as string, rating: item.rating as number | undefined, location: item.location as string | undefined, avatar: item.avatar as SiteContentBody['reviews'] extends Array<infer T> ? T extends { avatar?: infer I } ? I : never : never }));
    if (visibility.faq) body.faq = faq.map((item, index) => ({ id: String(item._id), order: index + 1, question: item.question as string, answer: item.answer as string }));
    return body;
  }

  async markPublished(): Promise<void> {
    await Promise.all([this.brands, this.heroes, this.ctas, this.footers, this.seoRecords, this.services, this.trustPoints, this.processSteps, this.categories, this.reviews, this.faq, this.contacts].map((model) => model.updateMany({ publishState: 'draft' }, { $set: { publishState: 'published' } }).exec()));
  }
}
