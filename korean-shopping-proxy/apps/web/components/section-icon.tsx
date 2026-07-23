import { BadgeCheck, Boxes, Circle, CreditCard, FileText, Home, Link2, MessageCircle, PackageCheck, Plane, ShieldCheck, ShoppingCart, Sparkles, Star } from "lucide-react"

const icons = { "badge-check": BadgeCheck, boxes: Boxes, circle: Circle, "credit-card": CreditCard, "file-text": FileText, home: Home, link: Link2, "message-circle": MessageCircle, "package-check": PackageCheck, plane: Plane, "shield-check": ShieldCheck, "shopping-cart": ShoppingCart, sparkles: Sparkles, star: Star }
export function SectionIcon({ name, className }: { name?: string; className?: string }) {
  const Icon = icons[(name ?? "circle") as keyof typeof icons] ?? Circle
  return <Icon className={className} aria-hidden="true" />
}
