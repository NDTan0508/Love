import '../styles/globals.css'
import type { Metadata, Viewport } from 'next'
import ToastContainer from '../components/ToastContainer'
import NotificationBell from '../components/NotificationBell'
import { ClientProviders } from '../components/ClientProviders'
import PWAProvider from '../components/PWAProvider'
import BottomNav from '../components/BottomNav'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'Love Mission',
    template: '%s - Love Mission'
  },
  description: 'Không gian riêng cho hai người lưu kỷ niệm, chơi cùng nhau và chăm cảm xúc mỗi ngày.',
  applicationName: 'Love Mission',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Love Mission'
  },
  icons: {
    icon: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }]
  },
  openGraph: {
    title: 'Love Mission',
    description: 'Một thế giới nhỏ, vui và riêng tư cho hai người đang yêu.',
    type: 'website'
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'Love Mission'
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#ff6b9d'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7fb_0%,#fffefe_45%,#fff5f8_100%)] text-indigo-950">
        <ClientProviders>
          <main className="mx-auto min-h-screen max-w-[430px] border-x border-pink-100/70 bg-[#fffafb]/90 shadow-[0_0_44px_rgba(236,72,153,0.08)]">
            {children}
          </main>
          <BottomNav />
        </ClientProviders>
        <NotificationBell />
        <ToastContainer />
        <PWAProvider />
      </body>
    </html>
  )
}
