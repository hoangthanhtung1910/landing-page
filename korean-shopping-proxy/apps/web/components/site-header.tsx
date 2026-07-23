import { Package } from "lucide-react"
import type { Brand, ContactChannel } from "@vyvy/content-types"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { ChannelIcon } from "@/components/channel-icon"
import { ThemeToggle } from "@/components/theme-toggle"
import { buildHref, externalLinkAttrs } from "@/lib/contact"
import { AnalyticsLink } from "@/components/analytics-link"
import Link from "next/link"

/**
 * Site header (T022, FR-013) — brand + a sticky contact action, rendered from CMS
 * content. A sticky header keeps a contact action reachable on desktop (the mobile
 * ContactBar covers small screens — FR-012). Optional-section nav links are added
 * with their sections in US3/US4; US1 does not link to sections that do not exist.
 */
export function SiteHeader({
  brand,
  contact,
}: {
  brand: Brand
  contact: ContactChannel[]
}) {
  const primary = contact.find((c) => c.type === "zalo") ?? contact[0]

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="Trang chủ VyVy Order Korea" className="flex min-h-11 items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Package className="size-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-extrabold tracking-tight">{brand.name}</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          {primary ? (
            <AnalyticsLink
              href={buildHref(primary)}
              {...externalLinkAttrs(primary)}
              aria-label={`Liên hệ qua ${primary.label}`}
              className={cn(buttonVariants(), "h-11 gap-2 px-4 font-semibold")}
              placement="header"
              channel={primary.type}
            >
              <ChannelIcon type={primary.type} className="size-4" />
              <span className="hidden sm:inline">{primary.label}</span>
            </AnalyticsLink>
          ) : null}
        </div>
      </div>
    </header>
  )
}
