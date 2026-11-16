'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { BookOpen, LineChart, Lock, ShieldCheck, Users } from 'lucide-react'
import { useReducedMotion, applyMotionPreference } from '@/lib/animation'

export default function AuthLayout({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion()
  return (
    <div className="auth-stage min-h-dvh bg-background transition-colors duration-300 lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(460px,0.92fr)]">
      <section className="auth-visual relative hidden min-h-dvh flex-col overflow-hidden px-10 py-9 text-white lg:flex xl:px-14 xl:py-11">
        <div className="auth-visual-shade absolute inset-0" />
        <motion.div
          initial={applyMotionPreference(reducedMotion, { opacity: 0, y: 8 }, {})}
          animate={applyMotionPreference(reducedMotion, { opacity: 1, y: 0 }, {})}
          transition={applyMotionPreference(reducedMotion, { duration: 0.45, ease: 'easeOut' }, { duration: 0.45, ease: 'easeOut' })}
          className="relative z-10 flex items-center gap-3"
        >
          <Image src="/logo.png" alt="NEST" width={46} height={46} className="rounded-xl border border-white/25 bg-white p-1 shadow-lg" />
          <div>
            <p className="text-lg font-bold tracking-[0.18em]">NEST</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">University Portal</p>
          </div>
        </motion.div>

        <motion.div
          initial={applyMotionPreference(reducedMotion, { opacity: 0, y: 18 }, {})}
          animate={applyMotionPreference(reducedMotion, { opacity: 1, y: 0 }, {})}
          transition={applyMotionPreference(reducedMotion, { duration: 0.55, delay: 0.08, ease: 'easeOut' }, { duration: 0.55, delay: 0.08, ease: 'easeOut' })}
          className="relative z-10 mt-auto max-w-xl pb-10"
        >
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/85 backdrop-blur-sm">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Ndejje University workspace
          </p>
          <h1 className="max-w-lg text-4xl font-bold leading-[1.15] tracking-tight xl:text-[2.75rem]">
            Make space for better work together.
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-white/75">
            Course groups, coursework and academic progress in one place built for your campus.
          </p>
          <ul className="mt-7 grid max-w-md gap-3 text-sm text-white/85">
            {[
              [Users, 'Form and manage course-unit groups'],
              [BookOpen, 'Track coursework, tasks and deadlines'],
              [LineChart, 'Reports for coordinators and lecturers'],
            ].map(([Icon, text]) => {
              const ItemIcon = Icon as typeof Users
              return (
                <li key={text as string} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-inset ring-white/15">
                    <ItemIcon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {text as string}
                </li>
              )
            })}
          </ul>
        </motion.div>

        <div className="relative z-10 flex items-center justify-between border-t border-white/15 pt-5 text-xs text-white/60">
          <span>© {new Date().getFullYear()} NEST · Kampala Campus</span>
          <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" aria-hidden="true" /> Secure sign-in</span>
        </div>
      </section>

      <motion.div
        initial={applyMotionPreference(reducedMotion, { opacity: 0 }, {})}
        animate={applyMotionPreference(reducedMotion, { opacity: 1 }, {})}
        transition={applyMotionPreference(reducedMotion, { duration: 0.35 }, { duration: 0.35 })}
        className="auth-form-pane relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-5 sm:px-10 lg:px-12 lg:py-8"
      >
        <div className="auth-form-pattern pointer-events-none absolute inset-0" />
        <div className="auth-form-surface relative z-10 w-full max-w-[440px] rounded-3xl border border-border/60 bg-surface/95 p-5 shadow-2xl backdrop-blur-xl sm:p-7 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
          {children}
        </div>
      </motion.div>
    </div>
  )
}