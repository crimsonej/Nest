'use client'

import { ThemeProvider } from 'next-themes'
import { ReactNode } from 'react'
import { useEffect } from 'react'
import { MotionConfig } from 'framer-motion'
import { AuthProvider } from '@/hooks/useAuth'
import { ToastProvider } from '@/hooks/useToast'
import { SemesterProvider } from '@/hooks/useSemester'

function PaletteInitializer() {
  useEffect(() => {
    const storedPalette = window.localStorage.getItem('nest-color-palette')
    const palette = storedPalette === 'crimson' || storedPalette === 'canopy' ? storedPalette : 'harbor'
    document.documentElement.dataset.palette = palette
  }, [])

  return null
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="nest-appearance-system">
      <MotionConfig reducedMotion="user">
        <PaletteInitializer />
        <AuthProvider>
          <SemesterProvider>
            <ToastProvider>{children}</ToastProvider>
          </SemesterProvider>
        </AuthProvider>
      </MotionConfig>
    </ThemeProvider>
  )
}