import type { ContactChannel } from "@vyvy/content-types"
import { buildHref, externalLinkAttrs } from "@/lib/contact"
import { ChannelIcon } from "@/components/channel-icon"
import { AnalyticsLink } from "@/components/analytics-link"

/**
 * Sticky mobile contact bar (T021, FR-012) — keeps Zalo, Kakao, and Messenger reachable from
 * every scroll position on mobile. Hidden on desktop (`md:hidden`), where a sticky
 * header carries the same actions. Tap targets are ≥44px tall (h-14).
 *
 * Zalo and Kakao are guaranteed present in `content.contact` (INV-6); Messenger
 * is included when configured. We render them in a fixed order regardless of CMS list order.
 */
const BAR_TYPES = ["zalo", "kakao", "messenger"] as const

export function ContactBar({ contact }: { contact: ContactChannel[] }) {
  const channels = BAR_TYPES.map((t) => contact.find((c) => c.type === t)).filter(
    (c): c is ContactChannel => Boolean(c),
  )
  if (channels.length === 0) return null

  return (
    <nav
      aria-label="Liên hệ nhanh"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto flex max-w-6xl">
        {channels.map((channel) => (
          <li key={channel.type} className="flex-1">
            <AnalyticsLink
              href={buildHref(channel)}
              {...externalLinkAttrs(channel)}
              className="flex h-14 items-center justify-center gap-2 text-sm font-semibold text-foreground active:bg-muted"
              placement="sticky-bar"
              channel={channel.type}
            >
              <ChannelIcon type={channel.type} className="size-5 text-primary" />
              {channel.label}
            </AnalyticsLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
