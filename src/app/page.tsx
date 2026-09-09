import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Users, BookOpen, Shield, BarChart3, ArrowRight, CheckCircle } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold text-xl text-text-primary">NEST</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-text-secondary hover:text-text-primary transition-colors">Features</Link>
            <Link href="#how-it-works" className="text-text-secondary hover:text-text-primary transition-colors">How It Works</Link>
            <Link href="/auth/login" className="text-text-secondary hover:text-text-primary transition-colors">Sign In</Link>
            <Link href="/auth/register">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="container mx-auto px-4 py-20 lg:py-32 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              New: Real-time Google Sheets sync now available
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold text-text-primary mb-6">
              Streamline Course Group Management
            </h1>
            <p className="text-lg lg:text-xl text-text-secondary mb-8 max-w-2xl mx-auto">
              A centralized platform for students and coordinators to create, manage, and track course groups with real-time synchronization and automated administrative reporting.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth/register">
                <Button size="lg" className="w-full sm:w-auto">
                  Start Free Trial
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <Link href="#demo">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  View Demo
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section id="features" className="container mx-auto px-4 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-text-primary mb-4">Built for University Workflows</h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Purpose-built features for student collaboration and coordinator oversight
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
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

        <section id="how-it-works" className="bg-surface border-y border-border py-20">
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
            Join universities already using NEST to streamline their course group administration.
          </p>
          <Link href="/auth/register">
            <Button size="lg">
              Create Free Account
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </section>
      </main>

      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4 text-center text-text-muted">
          <p>© 2024 NEST. Built for university course management.</p>
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