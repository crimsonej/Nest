'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useReducedMotion, applyMotionPreference } from '@/lib/animation'
import { LogIn, UserPlus } from 'lucide-react'
import ThemeToggle from '@/components/shared/ThemeToggle'

interface AuthNavHeaderProps {
  activeTab: 'login' | 'register'
}

export function AuthNavHeader({ activeTab }: AuthNavHeaderProps) {
  const router = useRouter()
  const reducedMotion = useReducedMotion()
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
              transition={applyMotionPreference(reducedMotion, { type: 'spring', stiffness: 450, damping: 35 }, { type: 'spring', stiffness: 0, damping: 0 })}
            />
          )}
          <LogIn className="relative z-10 h-4 w-4" aria-hidden="true" />
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
              transition={applyMotionPreference(reducedMotion, { type: 'spring', stiffness: 450, damping: 35 }, { type: 'spring', stiffness: 0, damping: 0 })}
            />
          )}
          <UserPlus className="relative z-10 h-4 w-4" aria-hidden="true" />
          <span className="relative z-10">Create Account</span>
        </button>
      </div>

      {/* Theme Switcher */}
      <ThemeToggle />
    </div>
  )
}
