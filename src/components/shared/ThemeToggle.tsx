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

  const options = [
    { id: 'light', label: 'Light', icon: Sun, color: 'text-amber-500', activeBg: 'bg-white shadow-md text-amber-600' },
    { id: 'mid', label: 'Crimson', icon: Flame, color: 'text-rose-500', activeBg: 'bg-rose-600 text-white shadow-md shadow-rose-600/30' },
    { id: 'dark', label: 'Dark', icon: Moon, color: 'text-cyan-400', activeBg: 'bg-slate-800 text-cyan-300 shadow-md' },
  ]

  return (
    <div className="relative inline-flex items-center gap-1 rounded-full border border-border/80 bg-surface/80 p-1 shadow-inner backdrop-blur-md transition-colors duration-300">
      {options.map((option) => {
        const Icon = option.icon
        const isActive = currentTheme === option.id

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setTheme(option.id)}
            aria-label={`${option.label} mode`}
            className={`relative z-10 flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors duration-200 select-none ${
              isActive ? (option.id === 'mid' ? 'text-white' : option.id === 'dark' ? 'text-cyan-300' : 'text-slate-900') : 'text-text-muted hover:text-text-primary'
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
              <Icon className={`h-3.5 w-3.5 ${isActive ? '' : option.color}`} />
              <span className="hidden sm:inline">{option.label}</span>
            </motion.div>
          </button>
        )
      })}
    </div>
  )
}
