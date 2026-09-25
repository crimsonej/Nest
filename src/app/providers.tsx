'use client'

import { ThemeProvider } from 'next-themes'
import { ReactNode } from 'react'
import { MotionConfig } from 'framer-motion'
import { AuthProvider } from '@/hooks/useAuth'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} themes={['light', 'mid', 'dark']}>
      <MotionConfig reducedMotion="user">
        <AuthProvider>{children}</AuthProvider>
      </MotionConfig>
    </ThemeProvider>
  )
}