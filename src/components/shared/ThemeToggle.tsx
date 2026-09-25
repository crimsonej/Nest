'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Flame, Moon } from 'lucide-react'
import { motion } from 'framer-motion'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="h-9 w-32 rounded-full bg-surface-hover border border-border animate-pulse" />
  }

  const currentTheme = theme || 'light'

  const handleThemeChange = (newTheme: string, event: React.MouseEvent<HTMLButtonElement>) => {
    if (newTheme === currentTheme) return

    const x = event.clientX
    const y = event.clientY

    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--click-x', `${x}px`)
      document.documentElement.style.setProperty('--click-y', `${y}px`)

      // @ts-ignore
      if ('startViewTransition' in document) {
        // @ts-ignore
        document.startViewTransition(() => {
          setTheme(newTheme)
        })
      } else {
        setTheme(newTheme)
      }
    } else {
      setTheme(newTheme)
    }
  }

  const options = [
    { id: 'light', label: 'Light', icon: Sun, color: 'text-amber-500', activeBg: 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 shadow-md shadow-amber-500/25' },
    { id: 'mid', label: 'Crimson', icon: Flame, color: 'text-rose-500', activeBg: 'bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 text-white shadow-md shadow-rose-600/35' },
    { id: 'dark', label: 'Dark', icon: Moon, color: 'text-cyan-400', activeBg: 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/30' },
  ]

  return (
    <div className="relative inline-flex items-center gap-1 rounded-full border border-border bg-surface/90 p-1 shadow-md backdrop-blur-xl transition-colors duration-300">
      {options.map((option) => {
        const Icon = option.icon
        const isActive = currentTheme === option.id

        return (
          <button
            key={option.id}
            type="button"
            onClick={(e) => handleThemeChange(option.id, e)}
            aria-label={`${option.label} mode`}
            className={`relative z-10 flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-all duration-200 select-none ${
              isActive ? 'text-white' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="activeThemeIndicator"
                className={`absolute inset-0 rounded-full ${option.activeBg}`}
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <motion.div
              whileHover={{ rotate: option.id === 'light' ? 45 : option.id === 'dark' ? -15 : 0, scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              className="relative z-10 flex items-center gap-1.5"
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-current' : option.color}`} />
              <span className="hidden sm:inline">{option.label}</span>
            </motion.div>
          </button>
        )
      })}
    </div>
  )
}
