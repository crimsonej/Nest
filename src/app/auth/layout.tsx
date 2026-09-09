import { ReactNode } from 'react'
import Link from 'next/link'
import { Users } from 'lucide-react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col items-center justify-center p-12 text-white">
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
              <Users className="h-6 w-6" />
            </div>
            <span className="font-semibold text-xl">NEST</span>
          </div>
          <h1 className="text-4xl font-bold mb-6">Streamline Course Group Management</h1>
          <p className="text-lg text-white/80 mb-8">
            A centralized platform for students and coordinators to create, manage, and track course groups with real-time synchronization and automated administrative reporting.
          </p>
          <div className="space-y-4 text-white/70">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center text-sm font-medium">1</div>
              <span>Coordinators set up course units and coursework</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center text-sm font-medium">2</div>
              <span>Students register and join or create groups</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center text-sm font-medium">3</div>
              <span>Automated tracking and Google Sheets sync</span>
            </div>
          </div>
        </div>
      </div>
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}