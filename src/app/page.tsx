import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Users, BookOpen, Shield, BarChart3, ArrowRight, CheckCircle } from 'lucide-react'
import DatabaseStatus from '@/components/shared/DatabaseStatus'
import ThemeToggle from '@/components/shared/ThemeToggle'

export default function HomePage() {
  return (
    <div className="site-grid min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />
        <div className="hero-orb hero-orb-three" />
      </div>

      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/85 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-2.5 sm:px-4 py-3 sm:py-5">
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div>
              <span className="text-lg sm:text-xl font-semibold tracking-[0.18em] text-text-primary">NEST</span>
              <p className="hidden text-[10px] uppercase tracking-[0.2em] text-text-muted md:block">Ndejje University</p>
            </div>
          </div>
          <nav className="flex items-center gap-1.5 sm:gap-4">
            <Link href="#features" className="hidden text-text-secondary hover:text-text-primary transition-colors md:block">Features</Link>
            <Link href="#how-it-works" className="hidden text-text-secondary hover:text-text-primary transition-colors md:block">How It Works</Link>
            <ThemeToggle />
            <Link href="/student/dashboard" className="hidden text-text-secondary hover:text-text-primary transition-colors md:block">Student portal</Link>
            <Link href="/coordinator/dashboard">
              <Button size="sm" className="px-2.5 sm:px-4 text-xs sm:text-sm">
                <span className="hidden min-[360px]:inline">Coordinator portal</span>
                <span className="min-[360px]:hidden">Portal</span>
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="container relative mx-auto px-4 py-24 lg:py-36">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Built for Ndejje University, Kampala Campus
            </div>
            <h1 className="fade-up text-5xl font-semibold leading-[1.05] tracking-tight text-text-primary lg:text-7xl">
              The calm center for course groups, tasks, and deadlines.
            </h1>
            <p className="fade-up mx-auto mb-9 max-w-2xl text-lg leading-8 text-text-secondary lg:text-xl">
              NEST gives students and coordinators one clear space to manage course units, group membership, assignments, and campus-wide coordination without duplicate data or stale information.
            </p>
            <div className="fade-up flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/student/dashboard">
                <Button size="lg" className="w-full sm:w-auto">
                  Open student portal
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <Link href="/coordinator/dashboard">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Open coordinator portal
                </Button>
              </Link>
            </div>
            <p className="mt-6 text-sm text-text-muted">
              Created by Kibirige Joachim Elijah · GitHub: <a href="https://github.com/crimsonej/crimsonej" target="_blank" rel="noreferrer" className="font-semibold text-primary hover:text-primary-hover">crimsonej/crimsonej</a>
            </p>
            <DatabaseStatus />
          </div>
        </section>

        <section id="features" className="container mx-auto px-4 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-text-primary mb-4">Built for University Workflows</h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Purpose-built features for student collaboration and coordinator oversight
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
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
              features={['Kanban-style task boards', 'File sharing per group', 'Due date tracking', 'Progress visualization']}
            />
            <FeatureCard
              icon={Shield}
              title="Coordinator Oversight"
              description="Complete administrative control with live group monitoring, intervention tools, automated sync, and comprehensive reporting."
              features={['Real-time group monitor', 'Auto-assign unassigned students', 'Google Sheets sync', 'Audit logs']}
            />
          </div>
        </section>

        <section id="how-it-works" className="border-y border-border bg-surface/80 py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-text-primary mb-4">How It Works</h2>
              <p className="text-lg text-text-secondary max-w-2xl mx-auto">
                Get started in three simple steps
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <StepCard
                number="01"
                title="Coordinator Setup"
                description="Coordinators create course units, publish coursework, and configure group size limits and auto-lock deadlines."
                icon={<CheckCircle className="h-6 w-6" />}
              />
              <StepCard
                number="02"
                title="Student Registration"
                description="Students register with their university details, browse available coursework, and create or join groups."
                icon={<Users className="h-6 w-6" />}
              />
              <StepCard
                number="03"
                title="Automated Tracking"
                description="Every group change syncs to Google Sheets automatically. Coordinators get real-time dashboards and exportable reports."
                icon={<BarChart3 className="h-6 w-6" />}
              />
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-text-primary mb-4">Ready to Simplify Group Management?</h2>
          <p className="text-lg text-text-secondary mb-8 max-w-2xl mx-auto">
            Register with your university details, then manage course units, groups, and coursework in one place.
          </p>
          <Link href="/auth/register">
            <Button size="lg">
              Register now
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </section>
      </main>

      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4 text-center text-text-muted">
          <p>© 2024 NEST. Created by Kibirige Joachim Elijah.</p>
          <p className="mt-2">
            GitHub: <a href="https://github.com/crimsonej/crimsonej" target="_blank" rel="noreferrer" className="font-medium text-primary hover:text-primary-hover">crimsonej/crimsonej</a>
          </p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, description, features }: { icon: React.ComponentType<{ className?: string }>, title: string, description: string, features: string[] }) {
  return (
    <div className="card p-6 h-full">
      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="text-xl font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-text-secondary mb-4">{description}</p>
      <ul className="space-y-2">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-text-secondary">
            <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  )
}

function StepCard({ number, title, description, icon }: { number: string, title: string, description: string, icon: React.ReactNode }) {
  return (
    <div className="relative card p-6">
      <div className="absolute -top-3 left-6 bg-background px-2 text-primary font-bold text-lg">{number}</div>
      <div className="pt-4">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 text-primary">
          {icon}
        </div>
        <h3 className="text-xl font-semibold text-text-primary mb-2">{title}</h3>
        <p className="text-text-secondary">{description}</p>
      </div>
    </div>
  )
}