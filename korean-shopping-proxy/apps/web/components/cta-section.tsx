import type { ContactCTA, ContactChannel } from "@vyvy/content-types"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { ChannelIcon } from "@/components/channel-icon"
import { resolveCta } from "@/lib/contact"
import { AnalyticsLink } from "@/components/analytics-link"

/**
 * Contact CTA §7 (T020, FR-010) — rendered from `content.cta`. Every channel is a
 * contact-only CtaRef (validated: contact-only + must include Zalo and Kakao); each
 * button's href is built from the referenced contact channel via `contact.ts`.
 */
export function CtaSection({
  cta,
  contact,
}: {
  cta: ContactCTA
  contact: ContactChannel[]
}) {
  return (
    <section id="lien-he" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
      <div className="overflow-hidden rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground sm:px-12 lg:py-20">
        <h2 className="mx-auto max-w-2xl text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
          {cta.headline}
        </h2>
        {cta.subtext ? (
          <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-primary-foreground/85">
            {cta.subtext}
          </p>
        ) : null}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {cta.channels.map((ref, i) => {
            const { href, external, channel } = resolveCta(ref, contact)
            return (
              <AnalyticsLink
                key={`${ref.channel}-${i}`}
                href={href}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className={cn(
                  buttonVariants({ size: "lg", variant: "secondary" }),
                  "h-12 gap-2 px-6 text-base font-semibold",
                )}
                placement="dedicated-cta"
                channel={ref.channel}
              >
                {channel ? <ChannelIcon type={channel.type} className="size-4" /> : null}
                {ref.label}
              </AnalyticsLink>
            )
          })}
        </div>
      </div>
    </section>
  )
}
