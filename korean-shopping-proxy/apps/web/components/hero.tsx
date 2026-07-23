import Image from "next/image"
import { ArrowRight } from "lucide-react"
import type { Brand, ContactChannel, Hero as HeroContent } from "@vyvy/content-types"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { ChannelIcon } from "@/components/channel-icon"
import { resolveCta } from "@/lib/contact"
import { AnalyticsLink } from "@/components/analytics-link"

/**
 * Hero §1 (T019, FR-004/FR-018) — rendered from CMS content.
 * - Single `<h1>` from `hero.headline` (the only h1 on the page — INV-2).
 * - Brand slogan/value proposition from `brand` + `hero.subheadline`.
 * - Above-the-fold PRIMARY contact CTA in the Korea-red accent; the destination
 *   is resolved from the referenced contact channel (guaranteed configured).
 * - Optional secondary CTA (in-page anchor or another contact channel).
 * - Optional hero media.
 */
export function Hero({
  hero,
  brand,
  contact,
  availableAnchors = [],
}: {
  hero: HeroContent
  brand: Brand
  contact: ContactChannel[]
  /**
   * In-page anchor ids (`#id`) that actually render in the current page shell.
   * A secondary anchor CTA whose target section is not present (e.g. `#quy-trinh`
   * before US4 adds the ordering-process section) is hidden rather than shipped as
   * a dead link. Site-relative and contact CTAs are always shown.
   */
  availableAnchors?: readonly string[]
}) {
  const primary = resolveCta(hero.primaryCta, contact)
  const sec = hero.secondaryCta
  const secondaryVisible =
    sec !== undefined &&
    !(sec.channel === "anchor" && sec.target.startsWith("#") && !availableAnchors.includes(sec.target))
  const secondary = secondaryVisible ? resolveCta(sec, contact) : null

  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
        <div className="flex flex-col items-start">
          {brand.tagline ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground">
              <span className="flex size-2 rounded-full bg-primary" />
              {brand.tagline}
            </span>
          ) : null}

          <h1 className="mt-6 text-pretty text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            {hero.headline}
          </h1>

          <p className="mt-4 text-pretty text-lg font-medium text-primary">{brand.slogan}</p>

          <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            {hero.subheadline}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {/* Primary contact CTA — Korea-red accent, high emphasis (FR-004). */}
            <AnalyticsLink
              href={primary.href}
              {...(primary.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-12 gap-2 bg-cta px-6 text-base font-semibold text-cta-foreground hover:bg-cta/90",
              )}
              placement="hero"
              channel={hero.primaryCta.channel}
            >
              {primary.channel ? <ChannelIcon type={primary.channel.type} className="size-4" /> : null}
              {hero.primaryCta.label}
              <ArrowRight className="size-4" />
            </AnalyticsLink>

            {secondary ? (
              <AnalyticsLink
                href={secondary.href}
                {...(secondary.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className={cn(
                  buttonVariants({ size: "lg", variant: "outline" }),
                  "h-12 gap-2 px-6 text-base font-semibold",
                )}
                placement="hero-secondary"
                channel={sec!.channel}
              >
                {secondary.channel ? <ChannelIcon type={secondary.channel.type} className="size-4" /> : null}
                {sec!.label}
              </AnalyticsLink>
            ) : null}
          </div>
        </div>

        {hero.media ? (
          <div className="relative">
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
              <Image
                src={hero.media.src}
                alt={hero.media.alt}
                width={hero.media.width ?? 720}
                height={hero.media.height ?? 820}
                priority
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
