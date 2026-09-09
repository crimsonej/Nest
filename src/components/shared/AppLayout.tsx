'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { StudentSidebar } from './student/StudentSidebar'
import { CoordinatorSidebar } from './coordinator/CoordinatorSidebar'
import { TopBar } from './shared/TopBar'
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
  const sidebarWidth = 'lg:w-64'

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className={cn('transition-all duration-300', sidebarWidth, 'lg:pl-64')}>
        <TopBar />
        <main className="p-4 lg:p-6" role="main">
          {children}
        </main>
      </div>
    </div>
  )
}