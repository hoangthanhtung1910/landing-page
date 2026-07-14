import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Be_Vietnam_Pro } from 'next/font/google'
import './globals.css'

const beVietnam = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-be-vietnam',
})

export const metadata: Metadata = {
  title: 'SeoulBox — Mua hộ & order hàng Hàn Quốc về Việt Nam',
  description:
    'SeoulBox giúp bạn mua hộ thời trang, mỹ phẩm K-beauty, đồ ăn vặt và đồ điện tử chính hãng từ Hàn Quốc, vận chuyển tận nhà tại Việt Nam. Nhanh chóng, minh bạch, uy tín.',
  generator: 'v0.app',
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
    <html lang="vi" className={`${beVietnam.variable} bg-background`}>
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
