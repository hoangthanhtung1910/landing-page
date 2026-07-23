import type { Metadata } from "next"
import { getSiteContent } from "@/lib/cms"
import { resolveMetadataBase } from "@/lib/metadata"
import { SiteHeader } from "@/components/site-header"
import { Hero } from "@/components/hero"
import { CtaSection } from "@/components/cta-section"
import { SiteFooter } from "@/components/site-footer"
import { ContactBar } from "@/components/contact-bar"
import { Services } from "@/components/services"
import { WhyChooseUs } from "@/components/why-choose-us"
import { OrderingProcess } from "@/components/ordering-process"
import { Categories } from "@/components/categories"
import { Testimonials } from "@/components/testimonials"
import { Faq } from "@/components/faq"
import { buildStructuredData } from "@/lib/structured-data"

// ISR: statically generated, revalidated on publish via the content tag (T017).
export const revalidate = 300

// Build-time content fetch is FAIL-CLOSED (T016/FR-030): if the CMS is down or
// returns invalid content, this throws and the build fails rather than shipping an
// empty page. Next dedupes the fetch shared with the page render.
export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent()
  // metadataBase resolves any RELATIVE metadata URL (e.g. a site-relative OG image
  // src) against the SITE origin — not the CMS/media origin. Absolute CMS/CDN media
  // URLs are unaffected (they win over the base). A declared-but-invalid site URL is
  // fail-closed (throws → build fails) rather than silently wrong-domain.
  const metadataBase = resolveMetadataBase(process.env.NEXT_PUBLIC_SITE_URL)
  return {
    metadataBase,
    title: content.seo.title,
    description: content.seo.description,
    alternates: content.seo.canonical ? { canonical: content.seo.canonical } : undefined,
    openGraph: {
      title: content.seo.title,
      description: content.seo.description,
      images: [{ url: content.seo.ogImage?.src ?? "/images/hero-shopping.png", alt: content.seo.ogImage?.alt ?? `${content.brand.name} — mua hộ hàng Hàn Quốc` }],
    },
    twitter: { card: "summary_large_image", title: content.seo.title, description: content.seo.description, images: [content.seo.ogImage?.src ?? "/images/hero-shopping.png"] },
  }
}

/**
 * Landing page shell (T023, FR-014/FR-015). US1 renders the REQUIRED sections from
 * CMS content — Hero §1, Contact CTA §7, Footer §8 — plus the sticky mobile
 * ContactBar. Optional sections §2–§6 + FAQ are inserted at the ordered slots
 * below by US3 (T036) and US4 (T041), preserving the FR-015 relative order.
 */
export default async function Page() {
  const content = await getSiteContent()

  // In-page anchor ids that actually render in this US1 shell. Anchor CTAs to
  // sections not present yet (e.g. #quy-trinh) are hidden until US3/US4 add them
  // and extend this list.
  const availableAnchors = ["#lien-he", ...(content.services ? ["#dich-vu"] : []), ...(content.trustPoints ? ["#vi-sao"] : []), ...(content.processSteps ? ["#quy-trinh"] : []), ...(content.categories ? ["#danh-muc"] : []), ...(content.reviews ? ["#danh-gia"] : []), ...(content.faq ? ["#hoi-dap"] : [])]
  const siteUrl = resolveMetadataBase(process.env.NEXT_PUBLIC_SITE_URL).toString().replace(/\/$/, "")
  const structuredData = buildStructuredData(content, siteUrl)

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader brand={content.brand} contact={content.contact} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      {/* pb on mobile so the fixed ContactBar never covers the footer. */}
      <main className="flex-1 pb-14 md:pb-0">
        <Hero
          hero={content.hero}
          brand={content.brand}
          contact={content.contact}
          availableAnchors={availableAnchors}
        />
        {content.services ? <Services items={content.services} /> : null}
        {content.trustPoints ? <WhyChooseUs items={content.trustPoints} /> : null}
        {content.processSteps ? <OrderingProcess items={content.processSteps} contact={content.contact} /> : null}
        {content.categories ? <Categories items={content.categories} /> : null}
        {content.reviews ? <Testimonials items={content.reviews} /> : null}
        {content.faq ? <Faq items={content.faq} /> : null}
        <CtaSection cta={content.cta} contact={content.contact} />
      </main>
      <SiteFooter footer={content.footer} brand={content.brand} contact={content.contact} />
      <ContactBar contact={content.contact} />
    </div>
  )
}
