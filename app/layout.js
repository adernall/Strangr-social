// app/layout.js
import { Outfit } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '../lib/AuthContext'

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-outfit',
})

export const metadata = {
  title: 'Strangr — Meet Someone New',
  description: 'Anonymous chat. Real connections.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={outfit.variable}>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}