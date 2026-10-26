'use client'

import { Suspense } from 'react'
import { motion } from 'framer-motion'
import { AuthStage } from '@/components/shared/AuthStage'
import { useReducedMotion, applyMotionPreference } from '@/lib/animation'

function AuthLoadingFallback() {
  const reducedMotion = useReducedMotion();

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md items-center px-5 py-10">
      <motion.div
        initial={applyMotionPreference(reducedMotion, { opacity: 0, y: 8 }, {})}
        animate={applyMotionPreference(reducedMotion, { opacity: 1, y: 0 }, {})}
        transition={applyMotionPreference(reducedMotion, { duration: 0.2, ease: 'easeOut' }, { duration: 0.2, ease: 'easeOut' })}
        className="w-full space-y-5 rounded-3xl border border-border/80 bg-surface/85 p-6 shadow-xl backdrop-blur-xl sm:p-8"
        role="status"
        aria-label="Loading sign-in"
      >
        <div className="h-7 w-40 animate-pulse rounded-lg bg-surface-hover" />
        <div className="h-4 w-56 animate-pulse rounded bg-surface-hover" />
        <div className="space-y-3 pt-3">
          <div className="h-11 animate-pulse rounded-xl bg-surface-hover" />
          <div className="h-11 animate-pulse rounded-xl bg-surface-hover" />
        </div>
        <div className="h-11 animate-pulse rounded-xl bg-primary/20" />
      </motion.div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthLoadingFallback />}>
      <AuthStage initialMode="login" />
    </Suspense>
  )
}