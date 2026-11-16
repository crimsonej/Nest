'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  LogIn,
  ShieldCheck,
  UserCog,
  UserPlus,
  Users,
} from 'lucide-react'
import ThemeToggle from '@/components/shared/ThemeToggle'
import { useReducedMotion } from '@/lib/animation'

const features = [
  {
    icon: Users,
    title: 'Group formation',
    description: 'Students find and join groups for each course unit, or coordinators place them automatically.',
    points: ['Groups per coursework', 'Join requests and approvals', 'Leaders and live rosters'],
  },
  {
    icon: BookOpen,
    title: 'Coursework and tasks',
    description: 'Every group gets a shared space for tasks, files and deadlines, so nothing slips.',
    points: ['Task boards per group', 'Deadlines and lock dates', 'Shared resources'],
  },
  {
    icon: BarChart3,
    title: 'Oversight and reports',
    description: 'Coordinators and lecturers see who is grouped, who is not, and export clean reports.',
    points: ['Unassigned student alerts', 'Excel, CSV and PDF exports', 'Semester calendar and reports'],
  },
]

const steps = [
  { title: 'Create your account', description: 'Sign up with your university email and registration number.' },
  { title: 'Pick your course units', description: 'Choose the units you are taking this semester.' },
  { title: 'Work in your groups', description: 'Join a group, share tasks and meet every deadline together.' },
]

const roles = [
  { icon: GraduationCap, title: 'Students', text: 'Join groups, track tasks and see every deadline in one place.' },
  { icon: ClipboardCheck, title: 'Coordinators', text: 'Set up course units, form groups and follow up on stragglers.' },
  { icon: UserCog, title: 'Lecturers', text: 'See your unit’s groups and students, and export rosters.' },
  { icon: ShieldCheck, title: 'Administrators', text: 'Manage faculties, courses, semesters and the student portal.' },
]

export default function HomePage() {
  const reducedMotion = useReducedMotion()
  const rise = (delay = 0) =>
    reducedMotion
      ? {}
      : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay, ease: 'easeOut' as const } }

  return (
    <div className="min-h-dvh bg-background text-text-primary">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <Image src="/logo.png" alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-xl" priority />
            <span className="text-base font-black tracking-[0.18em]">NEST</span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-text-secondary md:flex" aria-label="Sections">
            <a href="#features" className="transition-colors hover:text-text-primary">Features</a>
            <a href="#how-it-works" className="transition-colors hover:text-text-primary">How it works</a>
            <a href="#roles" className="transition-colors hover:text-text-primary">Who it’s for</a>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/auth/login"
              className="inline-flex h-10 items-center rounded-xl px-2.5 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-hover sm:px-3.5"
            >
              Sign in
            </Link>
            <Link
              href="/auth/register"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span className="hidden min-[400px]:inline">Get started</span>
              <span className="min-[400px]:hidden">Join</span>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative isolate overflow-hidden bg-[#0f2129] text-white">
          <Image
            src="/campus-building.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="-z-20 object-cover object-[center_35%]"
          />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(9,22,27,0.94)_0%,rgba(9,22,27,0.82)_45%,rgba(9,22,27,0.35)_100%)]" />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,rgba(9,22,27,0.85)_0%,transparent_45%)]" />

          <div className="mx-auto max-w-6xl px-4 pb-16 pt-20 sm:px-6 sm:pb-24 sm:pt-28 lg:pb-28 lg:pt-32">
            <motion.p {...rise(0)} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
              Ndejje University · Kampala Campus
            </motion.p>

            <motion.h1 {...rise(0.06)} className="mt-5 max-w-3xl text-[1.95rem] font-bold leading-[1.12] tracking-tight min-[400px]:text-[2.25rem] sm:text-5xl lg:text-6xl">
              Group work, coursework and deadlines in one campus workspace.
            </motion.h1>

            <motion.p {...rise(0.12)} className="mt-5 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
              NEST helps students form groups and stay on track, and gives coordinators and lecturers a clear view of every course unit.
            </motion.p>

            <motion.div {...rise(0.18)} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/auth/login"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-[#0f2129] shadow-lg transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f2129]"
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Sign in to your workspace
              </Link>
              <Link
                href="/auth/register"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Create an account
              </Link>
            </motion.div>

            <motion.ul {...rise(0.24)} className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/75">
              {['Student groups', 'Coursework tracking', 'Semester reports'].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-white/60" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </motion.ul>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 border-b border-border/60">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-primary">Features</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Everything a semester of group work needs</h2>
              <p className="mt-3 text-base leading-relaxed text-text-secondary">
                One place for students, coordinators and lecturers, so nobody is chasing lists across chats and spreadsheets.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {features.map(({ icon: Icon, title, description, points }) => (
                <article key={title} className="flex flex-col rounded-2xl border border-border/80 bg-surface p-6 shadow-sm transition-shadow hover:shadow-md">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">{description}</p>
                  <ul className="mt-5 space-y-2 border-t border-border/60 pt-5">
                    {points.map((point) => (
                      <li key={point} className="flex items-center gap-2.5 text-sm text-text-secondary">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-20 border-b border-border/60 bg-surface/50">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-primary">How it works</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Up and running in three steps</h2>
            </div>
            <ol className="mt-10 grid gap-5 md:grid-cols-3">
              {steps.map((step, index) => (
                <li key={step.title} className="relative rounded-2xl border border-border/80 bg-surface p-6">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">{index + 1}</span>
                  <h3 className="mt-4 text-base font-semibold">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Roles */}
        <section id="roles" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-primary">Who it’s for</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">A workspace for everyone on campus</h2>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {roles.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-2xl border border-border/80 bg-surface p-5">
                  <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                  <h3 className="mt-4 text-base font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{text}</p>
                </div>
              ))}
            </div>

            {/* Call to action */}
            <div className="mt-16 flex flex-col items-start justify-between gap-6 rounded-3xl bg-primary px-6 py-10 text-white sm:px-10 md:flex-row md:items-center">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium text-white/80">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" /> This semester
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Ready to get your group sorted?</h2>
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <Link href="/auth/register" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-primary transition-colors hover:bg-white/90">
                  Create an account <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link href="/auth/login" className="inline-flex h-12 items-center justify-center rounded-xl border border-white/35 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10">
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/70">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-text-muted sm:flex-row sm:px-6">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="" width={24} height={24} className="h-6 w-6 rounded-md" />
            <span>© {new Date().getFullYear()} NEST. Created by Kibirige Joachim Elijah.</span>
          </div>
          <a href="https://github.com/crimsonej" target="_blank" rel="noreferrer" className="font-medium text-text-secondary hover:text-primary">
            GitHub · crimsonej
          </a>
        </div>
      </footer>
    </div>
  )
}
