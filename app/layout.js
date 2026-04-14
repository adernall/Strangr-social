// app/layout.js
// REPLACE your existing layout.js with this.
// Adds TraceProvider so trace is available on every page.

import { Outfit } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '../lib/AuthContext'
import { TraceProvider } from '../components/TraceProvider'

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-outfit',
})

export const metadata = {
  title: 'Strangr — Meet Someone New',
  description: 'Anonymous chat. Real connections.',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={outfit.variable}>
      <body>
        <AuthProvider>
          <TraceProvider>
            {children}
          </TraceProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
