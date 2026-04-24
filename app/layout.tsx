import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { ToastProvider } from '@/components/ui/Toast'
import { ThemeProvider, THEME_INIT_SCRIPT } from '@/components/ui/ThemeProvider'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-dm-sans',
})

export const metadata: Metadata = {
  title: {
    default: 'Finsight — Control Financiero para PYMEs',
    template: '%s | Finsight',
  },
  description:
    'Visualiza tu runway, burn rate y flujo de caja en tiempo real. El copiloto financiero para startups y PYMEs en España y LATAM.',
  keywords: ['finsight', 'runway', 'burn rate', 'finanzas', 'startup', 'PYME', 'España', 'LATAM'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="es" className={dmSans.className} suppressHydrationWarning>
        <head>
          {/* Runs BEFORE hydration — sets `.dark` on <html> from localStorage
              to prevent a theme flash on first paint. */}
          <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        </head>
        <body>
          <ThemeProvider>
            <ToastProvider>{children}</ToastProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
