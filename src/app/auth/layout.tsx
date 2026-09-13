import { ReactNode } from 'react'
import { ArrowUpRight, Users } from 'lucide-react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="site-grid min-h-screen bg-background lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <div className="relative hidden overflow-hidden bg-[#123c3a] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border-[36px] border-teal-300/10" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-300 text-[#123c3a]">
              <Users className="h-6 w-6" />
            </div>
            <span className="text-xl font-semibold tracking-[0.18em]">NEST</span>
          </div>
          <p className="mt-20 text-sm font-medium uppercase tracking-[0.2em] text-teal-200">University collaboration, organized</p>
          <h1 className="mt-5 max-w-lg text-5xl font-semibold leading-[1.05]">Make every course group easier to run.</h1>
          <p className="mt-7 max-w-md text-lg leading-8 text-white/70">
            A centralized platform for students and coordinators to create, manage, and track course groups with real-time synchronization and automated administrative reporting.
          </p>
          <div className="mt-10 space-y-4 text-white/70">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-300/20 text-sm font-medium text-teal-200">1</div>
              <span>Coordinators set up course units and coursework</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-300/20 text-sm font-medium text-teal-200">2</div>
              <span>Students register and join or create groups</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-300/20 text-sm font-medium text-teal-200">3</div>
              <span>Automated tracking and Google Sheets sync</span>
            </div>
          </div>
        </div>
        <div className="relative flex items-center gap-2 text-sm text-white/50">Secure workspace access <ArrowUpRight className="h-4 w-4" /></div>
      </div>
      <div className="flex min-h-screen items-center justify-center p-5 sm:p-10">
        <div className="soft-panel w-full max-w-lg p-6 sm:p-10">{children}</div>
      </div>
    </div>
  )
}