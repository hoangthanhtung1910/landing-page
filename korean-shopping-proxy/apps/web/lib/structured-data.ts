import type { SiteContent } from "@vyvy/content-types"
export function buildStructuredData(content: SiteContent, siteUrl: string) {
  const ratings = (content.reviews ?? []).map((review) => review.rating).filter((rating): rating is number => typeof rating === "number")
  const business: Record<string, unknown> = {
    "@type": "LocalBusiness",
    "@id": `${siteUrl}#business`,
    name: content.brand.name,
    description: content.seo.description,
    url: siteUrl,
    contactPoint: content.contact.map((channel) => ({ "@type": "ContactPoint", contactType: channel.type, name: channel.label })),
  }
  if (ratings.length > 0) business.aggregateRating = { "@type": "AggregateRating", ratingValue: ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length, reviewCount: ratings.length, bestRating: 5, worstRating: 1 }
  return { "@context": "https://schema.org", "@graph": [business, { "@type": "Service", provider: { "@id": `${siteUrl}#business` }, name: content.hero.headline, serviceType: "Mua hộ và vận chuyển hàng Hàn Quốc về Việt Nam", areaServed: "VN" }] }
}
