import { ReactNode } from 'react'
import { ArrowUpRight, Check, CircleUserRound, Users, Sparkles } from 'lucide-react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-stage min-h-screen bg-background lg:grid lg:grid-cols-[1.08fr_0.92fr] transition-colors duration-300">
      {/* Visual Sidebar */}
      <div className="auth-visual relative hidden overflow-hidden p-10 text-white sm:p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="auth-grid absolute inset-0 opacity-30 pointer-events-none" />
        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-xl shadow-black/20">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <span className="text-2xl font-black tracking-[0.2em]">NEST</span>
          </div>

          <div className="mt-20 max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">
              University Collaboration, Organized
            </p>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight xl:text-6xl">
              Make every course group easier to run.
            </h1>
            <p className="mt-7 max-w-md text-base leading-8 text-white/80">
              One focused workspace for students and coordinators to move from scattered messages to clear, accountable progress.
            </p>
          </div>

          <div className="mt-10 grid max-w-lg gap-3 sm:grid-cols-3">
            {['Organize units', 'Build groups', 'Track progress'].map((item) => (
              <div key={item} className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md">
                <Check className="h-4 w-4 text-white" />
                <p className="mt-4 text-xs font-semibold text-white/90">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-white/70">
          <span className="flex items-center gap-2">
            <CircleUserRound className="h-4 w-4" /> University Workspace
          </span>
          <span className="flex items-center gap-2">
            Secure Workspace Access <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
      </div>

      {/* Form Pane */}
      <div className="auth-form-pane relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10 sm:px-10">
        <div className="auth-mobile-mark absolute left-6 top-6 flex items-center gap-3.5 lg:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white shadow-md shadow-primary/30">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-base font-black tracking-[0.2em] text-text-primary">NEST</span>
        </div>

        <div className="w-full max-w-lg rounded-3xl border border-border/80 bg-surface/90 p-6 sm:p-10 shadow-2xl backdrop-blur-xl transition-all">
          {children}
        </div>
      </div>
    </div>
  )
}