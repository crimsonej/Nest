'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { StudentSidebar } from '../student/StudentSidebar'
import { CoordinatorSidebar } from '../coordinator/CoordinatorSidebar'
import { TopBar } from './TopBar'
import { useAuth } from '@/hooks/useAuth'

interface LayoutProps {
  children: ReactNode
  role: 'student' | 'coordinator'
}

export function AppLayout({ children, role }: LayoutProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!user || user.role !== role) {
    return null
  }

  const Sidebar = role === 'student' ? StudentSidebar : CoordinatorSidebar
  return (
    <div className="workspace-surface min-h-screen bg-background">
      <Sidebar />
      <div className={cn('min-h-screen transition-all duration-300', 'lg:pl-[17rem]')}>
        <TopBar role={role} />
        <main className="mx-auto w-full max-w-[1500px] p-4 sm:p-7 lg:p-10" role="main">
          {children}
        </main>
      </div>
    </div>
  )
}