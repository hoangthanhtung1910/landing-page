import { SiteHeader } from "@/components/site-header"
import { Hero } from "@/components/hero"
import { TrustBar } from "@/components/trust-bar"
import { Categories } from "@/components/categories"
import { HowItWorks } from "@/components/how-it-works"
import { Features } from "@/components/features"
import { Pricing } from "@/components/pricing"
import { Testimonials } from "@/components/testimonials"
import { Faq } from "@/components/faq"
import { CtaSection } from "@/components/cta-section"
import { SiteFooter } from "@/components/site-footer"

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <TrustBar />
        <Categories />
        <HowItWorks />
        <Features />
        <Pricing />
        <Testimonials />
        <Faq />
        <CtaSection />
      </main>
      <SiteFooter />
    </div>
  )
}
