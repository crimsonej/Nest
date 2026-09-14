'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Users, BookOpen, Shield, CheckCircle, Sparkles, LogIn, UserPlus, ArrowRight } from 'lucide-react'
import ThemeToggle from '@/components/shared/ThemeToggle'
import { motion } from 'framer-motion'

export default function HomePage() {
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
  }

  return (
    <div className="site-grid min-h-screen bg-background relative overflow-hidden transition-colors duration-300 flex flex-col justify-between">
      {/* Background Animated Motion Orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />
        <div className="hero-orb hero-orb-three" />
      </div>

      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: 12, scale: 1.1 }}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30 text-white"
            >
              <Sparkles className="h-5 w-5" />
            </motion.div>
            <div>
              <span className="text-xl font-black tracking-[0.2em] text-text-primary">NEST</span>
              <p className="hidden text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted md:block">University Workspace</p>
            </div>
          </div>

          <nav className="flex items-center gap-2 sm:gap-4">
            <Link href="#features" className="hidden text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors md:block">
              Features
            </Link>
            <ThemeToggle />
            <Link href="/auth/login">
              <Button variant="outline" size="sm" className="px-3 text-xs font-semibold">
                <LogIn className="h-3.5 w-3.5 mr-1.5" />
                Sign In
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button size="sm" className="px-3.5 text-xs font-semibold">
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                Sign Up
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="container relative mx-auto px-4 py-20 lg:py-32">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mx-auto max-w-4xl text-center"
          >
            <motion.h1 variants={itemVariants} className="text-4xl font-extrabold leading-[1.08] tracking-tight text-text-primary sm:text-6xl lg:text-7xl">
              The calm center for course groups, tasks, and deadlines.
            </motion.h1>

            <motion.p variants={itemVariants} className="mx-auto mt-6 mb-10 max-w-2xl text-base leading-8 text-text-secondary sm:text-lg lg:text-xl">
              NEST gives students and coordinators one clear space to manage course units, group membership, assignments, and campus-wide coordination without duplicate data or stale information.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/auth/login" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto shadow-xl px-8">
                  Sign In
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <Link href="/auth/register" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto px-8">
                  Create an Account
                </Button>
              </Link>
            </motion.div>

            <motion.p variants={itemVariants} className="mt-8 text-xs text-text-muted">
              Created by Kibirige Joachim Elijah · GitHub:{' '}
              <a href="https://github.com/crimsonej" target="_blank" rel="noreferrer" className="font-bold text-primary hover:underline">
                crimsonej
              </a>
            </motion.p>
          </motion.div>
        </section>

        {/* Features Section */}
        <section id="features" className="container mx-auto px-4 py-20 border-t border-border/60">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-extrabold text-text-primary tracking-tight mb-4">
              Built for University Workflows
            </h2>
            <p className="text-base sm:text-lg text-text-secondary max-w-2xl mx-auto">
              Purpose-built tools designed for seamless student collaboration and real-time coordinator oversight.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
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
          </div>
        </section>
      </main>

      <footer className="border-t border-border/80 py-8 bg-surface/40">
        <div className="container mx-auto px-4 text-center text-xs text-text-muted space-y-2">
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
  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className="rounded-3xl border border-border/80 bg-surface/90 p-8 shadow-sm backdrop-blur-md hover:shadow-xl hover:border-primary/40 transition-all flex flex-col justify-between"
    >
      <div>
        <div className="h-14 w-14 rounded-2xl bg-primary-light flex items-center justify-center mb-6 text-primary shadow-sm">
          <Icon className="h-7 w-7" />
        </div>
        <h3 className="text-xl font-bold text-text-primary mb-3">{title}</h3>
        <p className="text-sm text-text-secondary leading-relaxed mb-6">{description}</p>
      </div>
      <ul className="space-y-2.5 border-t border-border/60 pt-6">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2.5 text-xs font-medium text-text-secondary">
            <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
            {feature}
          </li>
        ))}
      </ul>
    </motion.div>
  )
}