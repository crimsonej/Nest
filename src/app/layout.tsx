import type { Metadata } from 'next'
import '../styles/globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'NEST - University Course Group Management',
  description: 'Centralized platform for course unit grouping, collaborative organization, and administrative oversight',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}