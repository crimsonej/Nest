'use client'

import { ReactNode, useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { motion, useReducedMotion } from 'framer-motion'
import { StudentSidebar } from '../student/StudentSidebar'
import { CoordinatorSidebar } from '../coordinator/CoordinatorSidebar'
import { AdminSidebar } from '../admin/AdminSidebar'
import { LecturerSidebar } from '../lecturer/LecturerSidebar'
import { TopBar } from './TopBar'
import { RoleSwitchModal } from './RoleSwitchModal'
import { useAuth } from '@/hooks/useAuth'

interface LayoutProps {
  children: ReactNode
  role: 'student' | 'coordinator' | 'admin' | 'lecturer'
}

export function AppLayout({ children, role }: LayoutProps) {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const shouldReduceMotion = useReducedMotion()
  const [roleModalOpen, setRoleModalOpen] = useState(false)

  useEffect(() => {
    if (user && (user.role === 'admin' || user.status === 'admin' || user.status === 'coordinator' || user.status === 'selected_coordinator')) {
      const hasPrompted = typeof window !== 'undefined' ? window.sessionStorage.getItem(`role-prompted-${user.id}`) : null
      if (!hasPrompted) {
        setRoleModalOpen(true)
        if (typeof window !== 'undefined') window.sessionStorage.setItem(`role-prompted-${user.id}`, 'true')
      }
    }
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  const Sidebar =
    role === 'student'
      ? StudentSidebar
      : role === 'admin'
        ? AdminSidebar
        : role === 'lecturer'
          ? LecturerSidebar
          : CoordinatorSidebar

  const canSwitchWorkspace = user.role === 'admin' || user.status === 'admin' || user.status === 'coordinator' || user.status === 'selected_coordinator'

  return (
    <div className="workspace-surface min-h-screen bg-background overflow-x-hidden">
      <Sidebar />
      <div className={cn('min-h-screen min-w-0 transition-all duration-300', 'lg:pl-[17rem]')}>
        <TopBar
          role={role}
          onSwitchWorkspace={canSwitchWorkspace ? () => setRoleModalOpen(true) : undefined}
        />
        <main className="mx-auto w-full max-w-[1500px] min-w-0 px-3.5 pb-10 pt-4 sm:px-6 sm:py-8 lg:px-8 lg:py-8" role="main">
          <motion.div
            key={pathname}
            initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.22, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </main>
      </div>

      <RoleSwitchModal isOpen={roleModalOpen} onClose={() => setRoleModalOpen(false)} user={user} />
    </div>
  )
}