'use client'

import { ReactNode } from 'react'
import { motion, type Variants } from 'framer-motion'
import Image from 'next/image'
import { ArrowUpRight, Check, CircleUserRound } from 'lucide-react'

const featurePills = ['Organize units', 'Build groups', 'Track progress']

const sidebarVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
}

const sidebarItem: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring', stiffness: 380, damping: 30 },
  },
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-stage min-h-screen bg-background lg:grid lg:grid-cols-[1.1fr_0.9fr] transition-colors duration-300">
      {/* ── Visual Sidebar ── */}
      <div className="auth-visual relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between">
        {/* Grid overlay */}
        <div className="auth-grid absolute inset-0 opacity-25 pointer-events-none" />

        {/* Animated orbs */}
        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />

        {/* Extra glow pulse at bottom-right */}
        <div
          className="absolute bottom-0 right-0 h-96 w-96 rounded-full opacity-20 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)',
            animation: 'pulse-glow 6s ease-in-out infinite alternate',
          }}
        />

        {/* Content */}
        <motion.div
          variants={sidebarVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 flex flex-col justify-between h-full p-10 sm:p-14 text-white"
        >
          {/* Top section */}
          <div>
            {/* Logo */}
            <motion.div
              variants={sidebarItem}
              className="flex items-center gap-3"
            >
              <motion.div
                whileHover={{ scale: 1.08 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              >
                <Image src="/logo.png" alt="NEST Logo" width={48} height={48} className="rounded-2xl shadow-2xl shadow-black/30" />
              </motion.div>
              <span className="text-2xl font-black tracking-[0.22em]">
                NEST
              </span>
            </motion.div>

            {/* Hero copy */}
            <div className="mt-24 max-w-lg">
              <motion.p
                variants={sidebarItem}
                className="text-xs font-bold uppercase tracking-[0.22em] text-white/70"
              >
                University Collaboration, Organized
              </motion.p>
              <motion.h1
                variants={sidebarItem}
                className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight xl:text-5xl"
              >
                Make every course group easier to run.
              </motion.h1>
              <motion.p
                variants={sidebarItem}
                className="mt-6 max-w-md text-[15px] leading-8 text-white/75"
              >
                One focused workspace for students and coordinators to move from
                scattered messages to clear, accountable progress.
              </motion.p>
            </div>

            {/* Feature Pills */}
            <motion.div
              variants={sidebarItem}
              className="mt-10 flex flex-wrap gap-3"
            >
              {featurePills.map((item, i) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: 0.55 + i * 0.1,
                    type: 'spring',
                    stiffness: 400,
                    damping: 24,
                  }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="flex items-center gap-2.5 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-md"
                >
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <p className="text-xs font-semibold text-white/90">{item}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Bottom bar */}
          <motion.div
            variants={sidebarItem}
            className="flex items-center justify-between text-xs text-white/60 mt-10"
          >
            <span className="flex items-center gap-2">
              <CircleUserRound className="h-4 w-4" />
              University Workspace
            </span>
            <span className="flex items-center gap-2">
              Secure Workspace Access
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </motion.div>
        </motion.div>
      </div>

      {/* ── Form Pane ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="auth-form-pane relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-10"
      >
        {/* Animated Dot Background Pattern */}
        <div className="auth-form-dots absolute inset-0 opacity-45 pointer-events-none" />

        {/* Ambient Glowing Orbs behind form */}
        <div className="hero-orb hero-orb-bg-pane pointer-events-none" />
        <div
          className="absolute -bottom-10 -left-10 h-80 w-80 rounded-full opacity-20 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, var(--color-secondary) 0%, transparent 70%)',
            animation: 'pulse-glow 8s ease-in-out infinite alternate',
          }}
        />
        <div
          className="absolute -top-12 -right-12 h-96 w-96 rounded-full opacity-15 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)',
            animation: 'pulse-glow 10s ease-in-out infinite alternate-reverse',
          }}
        />

        {/* Mobile logo mark */}
        <div className="auth-mobile-mark absolute left-5 top-5 flex items-center gap-3 lg:hidden z-20">
          <Image src="/logo.png" alt="NEST Logo" width={40} height={40} className="rounded-2xl shadow-md" />
          <span className="text-base font-black tracking-[0.22em] text-text-primary">
            NEST
          </span>
        </div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.05 }}
          className="relative z-10 w-full max-w-xl rounded-3xl border border-border/80 bg-surface/90 p-6 sm:p-9 shadow-2xl backdrop-blur-2xl hover:border-primary/40 transition-all duration-300"
        >
          {children}
        </motion.div>
      </motion.div>
    </div>
  )
}