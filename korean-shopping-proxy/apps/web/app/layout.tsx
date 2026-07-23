import type { Metadata, Viewport } from 'next'
import { ThemeProvider } from '@/components/theme-provider'
import { ConsentAnalytics } from '@/components/consent-analytics'
import '@fontsource/be-vietnam-pro/vietnamese-300.css'
import '@fontsource/be-vietnam-pro/vietnamese-400.css'
import '@fontsource/be-vietnam-pro/vietnamese-500.css'
import '@fontsource/be-vietnam-pro/vietnamese-600.css'
import '@fontsource/be-vietnam-pro/vietnamese-700.css'
import '@fontsource/be-vietnam-pro/vietnamese-800.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'VyVy Order Korea — Mua hộ hàng Hàn Quốc về Việt Nam',
  description:
    'VyVy Order Korea giúp bạn mua hộ và vận chuyển hàng Hàn Quốc về Việt Nam nhanh chóng, minh bạch và an toàn.',
}

export const viewport: Viewport = {
  themeColor: '#e04a3f',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi" className="bg-background" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
          <ConsentAnalytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
