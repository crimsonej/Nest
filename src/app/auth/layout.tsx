'use client'

import { ReactNode } from 'react'
import { motion, type Variants } from 'framer-motion'
import Image from 'next/image'
import { ArrowUpRight, Check, ShieldCheck, Sparkles, Users, Lock, Zap } from 'lucide-react'

const featurePills = ['Organize units', 'Build groups', 'Track progress']

const sidebarVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.15 },
  },
}

const sidebarItem: Variants = {
  hidden: { opacity: 0, x: -24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring', stiffness: 380, damping: 28 },
  },
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-stage min-h-screen bg-background lg:grid lg:grid-cols-[1.15fr_0.85fr] transition-colors duration-300">
      {/* ── Visual Sidebar ── */}
      <div className="auth-visual relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between p-10 xl:p-14">
        {/* Dynamic Grid Overlay */}
        <div className="auth-grid absolute inset-0 opacity-30 pointer-events-none" />

        {/* Multi-layered Glowing Orbs */}
        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />
        <div className="hero-orb hero-orb-three" />

        {/* Ambient bottom-right glow */}
        <div
          className="absolute -bottom-10 -right-10 h-[30rem] w-[30rem] rounded-full opacity-30 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, var(--color-primary) 0%, color-mix(in srgb, var(--color-secondary) 50%, transparent) 50%, transparent 70%)',
            animation: 'pulse-glow 7s ease-in-out infinite alternate',
          }}
        />

        {/* Floating Particle Dots */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute h-1.5 w-1.5 rounded-full bg-white/40 shadow-sm"
              style={{
                left: `${15 + i * 14}%`,
                bottom: `${10 + (i % 3) * 20}%`,
                animation: `particle-rise ${4 + i * 1.5}s ease-in-out infinite`,
                animationDelay: `${i * 0.8}s`,
              }}
            />
          ))}
        </div>

        {/* Content */}
        <motion.div
          variants={sidebarVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 flex flex-col justify-between h-full text-white"
        >
          {/* Top section */}
          <div>
            {/* Logo Header */}
            <motion.div
              variants={sidebarItem}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-3.5">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                  className="relative"
                >
                  <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-r from-primary to-rose-500 opacity-60 blur-md animate-pulse" />
                  <Image src="/logo.png" alt="NEST Logo" width={52} height={52} className="relative rounded-2xl shadow-2xl shadow-black/40 border border-white/20" />
                </motion.div>
                <div>
                  <span className="text-2xl font-black tracking-[0.24em] text-white drop-shadow-md">
                    NEST
                  </span>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-white/70">
                    Campus Network
                  </p>
                </div>
              </div>

              {/* Security Badge */}
              <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold text-white/90 backdrop-blur-xl shadow-xs">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Verified Portal</span>
              </div>
            </motion.div>

            {/* Hero Heading & Tagline */}
            <div className="mt-16 max-w-lg">
              <motion.div variants={sidebarItem} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-[0.2em] text-white/90 backdrop-blur-md mb-4 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                University Workspaces & Grouping
              </motion.div>
              <motion.h1
                variants={sidebarItem}
                className="text-4xl font-extrabold leading-[1.08] tracking-tight xl:text-5xl text-white drop-shadow-sm"
              >
                Make every course group easier to run.
              </motion.h1>
              <motion.p
                variants={sidebarItem}
                className="mt-5 max-w-md text-sm sm:text-base leading-relaxed text-white/80"
              >
                One focused platform for students and coordinators to transition from scattered chat messages to organized, verifiable academic progress.
              </motion.p>
            </div>

            {/* Interactive Preview Card Showcase */}
            <motion.div
              variants={sidebarItem}
              className="mt-8 rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-xl shadow-2xl hover:border-white/40 transition-all duration-300"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/15">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-xs font-bold tracking-wide text-white">Live Group Formation</span>
                </div>
                <span className="text-[11px] font-semibold text-white/60">Ndejje University</span>
              </div>
              <div className="mt-3.5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">CS101 - Code Sprint Crew</p>
                  <p className="text-[11px] text-white/70 mt-0.5">5 Members Allocated · 1 Deadline Active</p>
                </div>
                <div className="flex -space-x-2">
                  <div className="h-7 w-7 rounded-full bg-blue-500 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-white">AN</div>
                  <div className="h-7 w-7 rounded-full bg-rose-500 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-white">DK</div>
                  <div className="h-7 w-7 rounded-full bg-purple-500 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-white">+3</div>
                </div>
              </div>
            </motion.div>

            {/* Feature Pills */}
            <motion.div
              variants={sidebarItem}
              className="mt-6 flex flex-wrap gap-2.5"
            >
              {featurePills.map((item, i) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: 0.45 + i * 0.08,
                    type: 'spring',
                    stiffness: 400,
                    damping: 24,
                  }}
                  whileHover={{ scale: 1.06, y: -2 }}
                  className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 backdrop-blur-md shadow-sm"
                >
                  <div className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-emerald-400/30">
                    <Check className="h-3 w-3 text-emerald-300" />
                  </div>
                  <p className="text-xs font-bold text-white/95">{item}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Bottom Bar */}
          <motion.div
            variants={sidebarItem}
            className="flex items-center justify-between text-xs font-semibold text-white/70 pt-6 border-t border-white/15"
          >
            <span className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-300" />
              Instant Authentication
            </span>
            <span className="flex items-center gap-1.5 text-white/90 hover:text-white transition-colors">
              Secure Workspace
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
        <div className="auth-form-dots absolute inset-0 opacity-50 pointer-events-none" />

        {/* Ambient Glowing Orbs behind form */}
        <div className="hero-orb hero-orb-bg-pane pointer-events-none" />
        <div
          className="absolute -bottom-16 -left-16 h-96 w-96 rounded-full opacity-25 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, var(--color-secondary) 0%, transparent 70%)',
            animation: 'pulse-glow 8s ease-in-out infinite alternate',
          }}
        />
        <div
          className="absolute -top-16 -right-16 h-[26rem] w-[26rem] rounded-full opacity-20 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)',
            animation: 'pulse-glow 10s ease-in-out infinite alternate-reverse',
          }}
        />

        {/* Mobile Logo Header */}
        <div className="auth-mobile-mark absolute left-5 top-5 flex items-center gap-3 lg:hidden z-20">
          <Image src="/logo.png" alt="NEST Logo" width={42} height={42} className="rounded-2xl shadow-md border border-border/80" />
          <div>
            <span className="text-base font-black tracking-[0.22em] text-text-primary block">
              NEST
            </span>
            <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-text-muted block">
              University Portal
            </span>
          </div>
        </div>

        {/* Main Card with Animated Glow Ring */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.05 }}
          className="relative z-10 w-full max-w-xl rounded-3xl border border-border/80 bg-surface/90 p-6 sm:p-9 shadow-2xl backdrop-blur-2xl hover:border-primary/50 transition-all duration-300 animated-glow-border"
        >
          {children}
        </motion.div>
      </motion.div>
    </div>
  )
}