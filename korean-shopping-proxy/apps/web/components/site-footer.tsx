import { Package } from "lucide-react"
import type { Brand, ContactChannel, Footer } from "@vyvy/content-types"
import { ChannelIcon } from "@/components/channel-icon"
import { buildHref, externalLinkAttrs } from "@/lib/contact"
import { AnalyticsLink } from "@/components/analytics-link"
import Link from "next/link"

/**
 * Site footer §8 (T022, FR-013) — brand, contact channels, supporting links, and
 * copyright, all rendered from CMS content. Contact links are built via
 * `contact.ts`; footer links use their validated hrefs (https / site-relative /
 * anchor only, per the shared schema).
 */
export function SiteFooter({
  footer,
  brand,
  contact,
}: {
  footer: Footer
  brand: Brand
  contact: ContactChannel[]
}) {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
          <div>
            <Link href="/" aria-label="Về đầu trang VyVy Order Korea" className="flex min-h-11 items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Package className="size-5" aria-hidden="true" />
              </span>
              <span className="text-lg font-extrabold tracking-tight">{brand.name}</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {footer.contactSummary}
            </p>
          </div>

          <div className="flex flex-col gap-4 md:items-end">
            <ul className="flex flex-wrap gap-3">
              {contact.map((channel) => (
                <li key={channel.type}>
                  <AnalyticsLink
                    href={buildHref(channel)}
                    {...externalLinkAttrs(channel)}
                    className="flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                    placement="footer"
                    channel={channel.type}
                  >
                    <ChannelIcon type={channel.type} className="size-4 text-primary" />
                    {channel.label}
                  </AnalyticsLink>
                </li>
              ))}
            </ul>
            {footer.links.length > 0 ? (
              <ul className="flex flex-wrap gap-5">
                {footer.links.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} className="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground">
          <p>{footer.copyright}</p>
        </div>
      </div>
    </footer>
  )
}
