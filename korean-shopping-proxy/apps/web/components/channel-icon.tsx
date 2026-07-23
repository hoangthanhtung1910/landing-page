import { Globe, Mail, MessageCircle, MessageCircleMore, MessageSquare, Phone, type LucideIcon } from "lucide-react"
import type { ContactChannelType } from "@vyvy/content-types"

/**
 * Fixed per-type icon map for contact channels. The public `ContactChannel.icon`
 * string is an admin hint, but the channel `type` set is small and closed, so we
 * render a known, bundled lucide icon per type rather than resolving an arbitrary
 * icon name at runtime — reliable SSR, no dynamic import, always a real glyph.
 */
const ICON_BY_TYPE: Record<ContactChannelType, LucideIcon> = {
  zalo: MessageCircle,
  kakao: MessageSquare,
  messenger: MessageCircleMore,
  phone: Phone,
  email: Mail,
  social: Globe,
}

export function ChannelIcon({
  type,
  className,
}: {
  type: ContactChannelType
  className?: string
}) {
  const Icon = ICON_BY_TYPE[type]
  return <Icon className={className} aria-hidden="true" />
}
