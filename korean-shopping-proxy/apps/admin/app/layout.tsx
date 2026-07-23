import type { ReactNode } from "react"
import "./globals.css"

export const metadata = {
  title: "VyVy Order Korea — Admin",
  description: "Internal CMS admin dashboard",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
