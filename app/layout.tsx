import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Runway — Control Financiero para PYMEs',
    template: '%s | Runway',
  },
  description:
    'Visualiza tu runway, burn rate y flujo de caja en tiempo real. El copiloto financiero para startups y PYMEs en España y LATAM.',
  keywords: ['runway', 'burn rate', 'finanzas', 'startup', 'PYME', 'España', 'LATAM'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="es">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
