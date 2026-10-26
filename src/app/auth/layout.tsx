'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { ArrowUpRight, ShieldCheck } from 'lucide-react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-stage min-h-dvh bg-background transition-colors duration-300 lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(460px,0.92fr)]">
      <section className="auth-visual relative hidden min-h-dvh flex-col justify-between overflow-hidden px-10 py-9 text-white lg:flex xl:px-16 xl:py-12">
        <div className="auth-visual-shade absolute inset-0" />
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="relative z-10 flex items-center gap-3"
        >
          <Image src="/logo.png" alt="NEST" width={46} height={46} className="rounded-xl border border-white/25 bg-white p-1 shadow-lg" />
          <div>
            <p className="text-lg font-bold tracking-[0.18em]">NEST</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">University Portal</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08, ease: 'easeOut' }}
          className="relative z-10 mb-8 max-w-xl"
        >
          <p className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/75">
            <ShieldCheck className="h-4 w-4" />
            A secure campus workspace
          </p>
          <h1 className="max-w-lg text-4xl font-semibold leading-[1.12] xl:text-5xl">
            Make space for better work together.
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-white/75">
            Bring courses, groups, and academic progress into one place built for your campus.
          </p>
          <div className="mt-9 flex items-center gap-2 text-sm font-medium text-white/80">
            <span className="h-px w-9 bg-white/50" />
            Connected learning, made practical
          </div>
        </motion.div>

        <div className="relative z-10 flex items-center justify-between border-t border-white/20 pt-5 text-xs text-white/65">
          <span>NEST Campus Network</span>
          <span className="flex items-center gap-1.5">Secure access <ArrowUpRight className="h-3.5 w-3.5" /></span>
        </div>
      </section>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="auth-form-pane relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-8 sm:px-10 lg:px-12"
      >
        <div className="auth-form-pattern pointer-events-none absolute inset-0" />
        <div className="relative z-10 w-full max-w-[440px]">
          <div className="mb-9 flex items-center gap-3 lg:hidden">
            <Image src="/logo.png" alt="NEST" width={42} height={42} className="rounded-xl border border-border bg-surface p-1 shadow-sm" />
            <div>
              <p className="text-base font-bold tracking-[0.17em] text-text-primary">NEST</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">University Portal</p>
            </div>
          </div>
          {children}
        </div>
      </motion.div>
    </div>
  )
}