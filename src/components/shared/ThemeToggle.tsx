'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Sunset, Moon } from 'lucide-react'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="h-9 w-28 rounded-full bg-surface-hover border border-border animate-pulse" />
  }

  const currentTheme = theme || 'light'

  return (
    <div className="relative inline-flex items-center gap-1 rounded-full border border-border bg-surface/90 p-1 shadow-inner backdrop-blur transition-all duration-300">
      <button
        type="button"
        onClick={() => setTheme('light')}
        aria-label="Light mode"
        className={`relative z-10 flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-all duration-200 ${
          currentTheme === 'light'
            ? 'text-primary shadow-sm'
            : 'text-text-muted hover:text-text-primary'
        }`}
      >
        <Sun className="h-3.5 w-3.5 transition-transform duration-300 hover:rotate-45" />
        <span className="hidden sm:inline">Light</span>
      </button>

      <button
        type="button"
        onClick={() => setTheme('mid')}
        aria-label="Mid sepia mode"
        className={`relative z-10 flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-all duration-200 ${
          currentTheme === 'mid'
            ? 'text-amber-600 dark:text-amber-400 shadow-sm'
            : 'text-text-muted hover:text-text-primary'
        }`}
      >
        <Sunset className="h-3.5 w-3.5 transition-transform duration-300 hover:scale-110" />
        <span className="hidden sm:inline">Mid</span>
      </button>

      <button
        type="button"
        onClick={() => setTheme('dark')}
        aria-label="Dark mode"
        className={`relative z-10 flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-all duration-200 ${
          currentTheme === 'dark'
            ? 'text-cyan-400 shadow-sm'
            : 'text-text-muted hover:text-text-primary'
        }`}
      >
        <Moon className="h-3.5 w-3.5 transition-transform duration-300 hover:-rotate-12" />
        <span className="hidden sm:inline">Dark</span>
      </button>
    </div>
  )
}
