'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { Users, BookOpen, Shield, CheckCircle, LogIn, UserPlus, ArrowRight, Sparkles } from 'lucide-react'
import ThemeToggle from '@/components/shared/ThemeToggle'
import { motion } from 'framer-motion'
import { useReducedMotion, applyMotionPreference } from '@/lib/animation'

export default function HomePage() {
  const reducedMotion = useReducedMotion()
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <div className="site-grid min-h-screen bg-background relative overflow-hidden transition-colors duration-300 flex flex-col justify-between">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/75 backdrop-blur-xl">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-1 px-4 py-3.5 sm:flex-nowrap sm:gap-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3 max-[380px]:w-full">
            <motion.div
              whileHover={applyMotionPreference(reducedMotion, { scale: 1.05 }, {})}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="shrink-0"
            >
              <Image src="/logo.png" alt="NEST Logo" width={44} height={44} className="h-10 w-10 shrink-0 rounded-2xl sm:h-11 sm:w-11" priority />
            </motion.div>
            <div>
              <span className="text-lg font-black tracking-[0.14em] text-text-primary sm:text-xl sm:tracking-[0.2em]">NEST</span>
              <p className="hidden text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted md:block">University Workspace</p>
            </div>
          </div>

          <nav className="flex shrink-0 items-center justify-end gap-1 sm:gap-4 max-[380px]:ml-auto max-[380px]:w-full">
            <Link href="#features" className="hidden text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors md:block">
              Features
            </Link>
            <ThemeToggle />
            <Link href="/auth/login">
              <Button variant="outline" size="sm" className="min-h-11 min-w-11 px-2 text-xs font-semibold sm:min-h-10 sm:min-w-0 sm:px-3">
                <LogIn className="mr-0 h-3.5 w-3.5 sm:mr-1.5" />
                <span className="sr-only sm:not-sr-only">Sign In</span>
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button size="sm" className="min-h-11 min-w-11 px-2 text-xs font-semibold sm:min-h-10 sm:min-w-0 sm:px-3.5">
                <UserPlus className="mr-0 h-3.5 w-3.5 sm:mr-1.5" />
                <span className="sr-only sm:not-sr-only">Sign Up</span>
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative isolate flex min-h-[520px] items-end overflow-hidden bg-[#15272b] px-5 pb-12 pt-24 text-white sm:min-h-[600px] sm:px-8 sm:pb-16 lg:min-h-[660px] lg:px-14 lg:pb-20">
          <Image
            src="/campus-building.jpg"
            alt="A university campus building framed by trees and a lawn"
            fill
            priority
            sizes="100vw"
            className="-z-20 object-cover object-center"
          />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(13,29,34,0.92)_0%,rgba(13,29,34,0.78)_42%,rgba(13,29,34,0.20)_100%)]" />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,rgba(13,29,34,0.64)_0%,transparent_48%)]" />
          <div className="pointer-events-none absolute right-8 top-8 hidden h-40 w-40 rounded-full border border-white/20 lg:block" />
          <div className="pointer-events-none absolute right-16 top-16 hidden h-24 w-24 rounded-full border border-white/25 lg:block" />
          <motion.div
            variants={applyMotionPreference(reducedMotion,
              { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.15 } } },
              { hidden: { opacity: 0 }, visible: { opacity: 1 } }
            )}
            initial="hidden"
            animate="visible"
            className="mx-auto w-full max-w-[1440px]"
          >
            <motion.div
              variants={applyMotionPreference(reducedMotion,
                { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } },
                { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }
              )}
              className="mb-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-white/80"
            >
              <span className="h-px w-8 bg-secondary" />
              Campus collaboration
            </motion.div>

            <motion.h1
              variants={applyMotionPreference(reducedMotion,
                { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } },
                { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }
              )}
              className="max-w-3xl text-3xl font-semibold leading-[1.08] sm:text-6xl sm:leading-[1.04] lg:text-7xl"
            >
              A better way to do university work, together.
            </motion.h1>

            <motion.p
              variants={applyMotionPreference(reducedMotion,
                { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } },
                { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }
              )}
              className="mb-8 mt-5 max-w-xl text-base leading-7 text-white/80 sm:text-lg sm:leading-8"
            >
              Bring course groups, assignments, and campus coordination into one shared workspace built for students and faculty.
            </motion.p>

            <motion.div
              variants={applyMotionPreference(reducedMotion,
                { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } },
                { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }
              )}
              className="mb-10 flex flex-col gap-3 sm:flex-row"
            >
              <Link href="/auth/login" className="w-full sm:w-auto">
                <Button size="lg" className="w-full border-0 bg-white px-8 text-[#1c3238] shadow-lg hover:bg-white/90 sm:w-auto">
                  Enter workspace
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <Link href="/auth/register" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full border-white/40 bg-white/10 px-8 text-white backdrop-blur-sm hover:border-white hover:bg-white/15 sm:w-auto">
                  Create Account
                </Button>
              </Link>
            </motion.div>

            <motion.div
              variants={applyMotionPreference(reducedMotion,
                { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } },
                { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }
              )}
              className="flex flex-wrap gap-x-7 gap-y-3 text-xs font-semibold text-white/80 sm:text-sm"
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-secondary" />
                Student collaboration
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-secondary" />
                Coursework management
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-secondary" />
                Academic oversight
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* Features Section */}
        <section id="features" className="container mx-auto px-4 py-20 border-t border-border/60">
          <motion.div
            initial={applyMotionPreference(reducedMotion, { opacity: 0, y: 14 }, {})}
            whileInView={applyMotionPreference(reducedMotion, { opacity: 1, y: 0 }, {})}
            viewport={{ once: true, amount: 0.3 }}
            transition={applyMotionPreference(reducedMotion, { duration: 0.45, ease: 'easeOut' }, { duration: 0.45, ease: 'easeOut' })}
            className="mb-16 text-center"
          >
            <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-text-primary lg:text-5xl">
              Built for Modern University Workflows
            </h2>
            <p className="mx-auto max-w-2xl text-base text-text-secondary sm:text-lg">
              Purpose-built tools designed for seamless student collaboration and real-time coordinator oversight.
            </p>
          </motion.div>

          <motion.div
            variants={applyMotionPreference(reducedMotion,
              { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } },
              { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }
            )}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.12 }}
            className="grid gap-8 md:grid-cols-3"
          >
            <FeatureCard
              icon={Users}
              title="Student Group Formation"
              description="Students can create, browse, and join project groups categorized by course units with public/private visibility and join request management."
              features={['Course-based group discovery', 'Private groups with approval', 'Real-time roster updates', 'WhatsApp integration']}
            />
            <FeatureCard
              icon={BookOpen}
              title="Coursework & Task Management"
              description="Per-coursework group workspaces with task tracking, resource sharing, and deadline management across all assignments."
              features={['Kanban task boards', 'File sharing per group', 'Due date tracking', 'Progress visualization']}
            />
            <FeatureCard
              icon={Shield}
              title="Coordinator Oversight"
              description="Complete administrative control with live group monitoring, intervention tools, automated sync, and comprehensive reporting."
              features={['Real-time group monitor', 'Auto-assign unassigned students', 'Google Sheets sync', 'Audit logs']}
            />
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-border/80 bg-surface/50 py-8 backdrop-blur-sm">
        <div className="container mx-auto space-y-2 px-4 text-center text-xs text-text-muted">
          <p>© 2026 NEST. Created by Kibirige Joachim Elijah.</p>
          <p>
            GitHub:{' '}
            <a href="https://github.com/crimsonej" target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">
              crimsonej
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, description, features }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string; features: string[] }) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      variants={applyMotionPreference(reducedMotion,
        { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } } },
        { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } } }
      )}
      whileHover={applyMotionPreference(reducedMotion, { y: -6, scale: 1.01 }, {})}
      transition={applyMotionPreference(reducedMotion, { type: 'spring', stiffness: 350, damping: 25 }, {})}
      className="flex h-full flex-col justify-between rounded-3xl border border-border/80 bg-surface/85 p-6 shadow-lg backdrop-blur-xl transition-all hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 sm:p-8"
    >
      <div>
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-secondary text-white shadow-md shadow-primary/30">
          <Icon className="h-7 w-7" />
        </div>
        <h3 className="text-xl font-bold text-text-primary mb-3">{title}</h3>
        <p className="text-sm text-text-secondary leading-relaxed mb-6">{description}</p>
      </div>
      <ul className="space-y-2.5 border-t border-border/60 pt-6">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2.5 text-xs font-semibold text-text-secondary">
            <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
            {feature}
          </li>
        ))}
      </ul>
    </motion.div>
  )
}