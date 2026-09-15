'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { motion } from 'framer-motion'
import { SunMedium, MoonStar, Flame, LogIn, UserPlus } from 'lucide-react'

interface AuthNavHeaderProps {
  activeTab: 'login' | 'register'
}

export function AuthNavHeader({ activeTab }: AuthNavHeaderProps) {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()

  function cycleTheme() {
    const order = ['light', 'mid', 'dark'] as const
    const current = (resolvedTheme as (typeof order)[number]) || 'light'
    const index = order.indexOf(current)
    setTheme(order[(index + 1) % order.length])
  }

  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/70 pb-6 mb-6">
      {/* Sliding Tab Switcher */}
      <div className="relative inline-flex items-center rounded-2xl border border-border/80 bg-surface-hover/60 p-1 shadow-inner backdrop-blur-md">
        <button
          type="button"
          onClick={() => activeTab !== 'login' && router.push('/auth/login')}
          className={`relative z-10 flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-colors duration-200 select-none ${
            activeTab === 'login' ? 'text-white' : 'text-text-muted hover:text-text-primary'
          }`}
        >
          {activeTab === 'login' && (
            <motion.div
              layoutId="activeAuthTabPill"
              className="absolute inset-0 rounded-xl bg-primary shadow-md shadow-primary/30"
              transition={{ type: 'spring', stiffness: 450, damping: 35 }}
            />
          )}
          <LogIn className="relative z-10 h-3.5 w-3.5" />
          <span className="relative z-10">Sign In</span>
        </button>

        <button
          type="button"
          onClick={() => activeTab !== 'register' && router.push('/auth/register')}
          className={`relative z-10 flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-colors duration-200 select-none ${
            activeTab === 'register' ? 'text-white' : 'text-text-muted hover:text-text-primary'
          }`}
        >
          {activeTab === 'register' && (
            <motion.div
              layoutId="activeAuthTabPill"
              className="absolute inset-0 rounded-xl bg-primary shadow-md shadow-primary/30"
              transition={{ type: 'spring', stiffness: 450, damping: 35 }}
            />
          )}
          <UserPlus className="relative z-10 h-3.5 w-3.5" />
          <span className="relative z-10">Create Account</span>
        </button>
      </div>

      {/* Theme Switcher */}
      <motion.button
        whileHover={{ scale: 1.1, rotate: 15 }}
        whileTap={{ scale: 0.9 }}
        type="button"
        onClick={cycleTheme}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/80 bg-surface/80 text-text-secondary transition shadow-xs hover:text-text-primary"
        aria-label="Switch theme"
        title="Switch theme"
      >
        {resolvedTheme === 'dark' ? (
          <SunMedium className="h-4 w-4 text-amber-400" />
        ) : resolvedTheme === 'mid' ? (
          <Flame className="h-4 w-4 text-rose-500" />
        ) : (
          <MoonStar className="h-4 w-4 text-slate-700" />
        )}
      </motion.button>
    </div>
  )
}
