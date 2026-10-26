'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { FileText, Users, GraduationCap, LogOut, Menu, X, BookCopy, Sparkles, User, Settings } from 'lucide-react'
import Image from 'next/image'
import { useAuth } from '@/hooks/useAuth'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { SidebarCampusPanel } from '@/components/shared/SidebarCampusPanel'
import { useReducedMotion, applyMotionPreference } from '@/lib/animation'

const navigation = [
  { name: 'Reports', href: '/lecturer/reports', icon: FileText },
  { name: 'Courseworks', href: '/lecturer/courseworks', icon: BookCopy },
  { name: 'Groups', href: '/lecturer/groups', icon: Users },
  { name: 'Students', href: '/lecturer/students', icon: GraduationCap },
  { name: 'Settings', href: '/lecturer/settings', icon: Settings },
]

export function LecturerSidebar() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const reducedMotion = useReducedMotion()

  return (
    <>
      {/* Mobile Toggle Button */}
      <motion.button
        whileHover={applyMotionPreference(reducedMotion, { scale: 1.05 }, {})}
        whileTap={applyMotionPreference(reducedMotion, { scale: 0.95 }, {})}
        className="fixed left-3 top-3 z-40 flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-surface text-text-primary shadow-lg lg:hidden"
        onClick={() => setMobileMenuOpen(true)}
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </motion.button>

      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-[17rem] flex-col border-r border-border bg-surface/95 text-text-primary backdrop-blur-2xl shadow-xl transition-colors duration-300"
        aria-label="Lecturer navigation"
      >
        <SidebarContent pathname={pathname} user={user} signOut={signOut} reducedMotion={reducedMotion} onClose={() => {}} />
      </aside>

      {/* Mobile Drawer Slide-in */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={applyMotionPreference(reducedMotion, { opacity: 0 }, {})}
              animate={applyMotionPreference(reducedMotion, { opacity: 1 }, {})}
              exit={applyMotionPreference(reducedMotion, { opacity: 0 }, {})}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={applyMotionPreference(reducedMotion, { type: 'spring', stiffness: 350, damping: 30 }, {})}
              className="fixed inset-y-0 left-0 z-50 w-[17rem] border-r border-border bg-surface text-text-primary shadow-2xl lg:hidden"
              aria-label="Lecturer mobile navigation"
            >
              <SidebarContent pathname={pathname} user={user} signOut={signOut} reducedMotion={reducedMotion} onClose={() => setMobileMenuOpen(false)} isMobile />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

function SidebarContent({
  pathname,
  user,
  signOut,
  reducedMotion,
  onClose,
  isMobile = false,
}: {
  pathname: string
  user: any
  signOut: () => void
  reducedMotion: boolean
  onClose: () => void
  isMobile?: boolean
}) {
  return (
    <div className="workspace-sidebar-content relative flex h-full flex-col overflow-hidden bg-surface text-text-primary transition-colors duration-300">

      {/* Sidebar Header / Logo */}
      <div className="workspace-sidebar-header relative z-10 flex h-20 items-center justify-between border-b px-5 backdrop-blur-md">
        <Link href="/lecturer/reports" onClick={onClose} className="flex items-center gap-3 group">
          <div className="workspace-brand-mark relative flex h-10 w-10 items-center justify-center rounded-2xl p-0.5 group-hover:scale-105 transition-transform duration-200">
            <Image src="/logo.png" alt="NEST Logo" width={36} height={36} className="rounded-[14px] shrink-0" />
          </div>
          <div>
            <strong className="block text-base tracking-[0.2em] font-extrabold text-text-primary">NEST</strong>
            <small className="workspace-role-chip"><span className="h-1.5 w-1.5 rounded-full bg-primary" />Lecturer Portal</small>
          </div>
        </Link>
        {isMobile && (
          <button
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>

      <SidebarCampusPanel />

      {/* Navigation Links */}
      <nav className="workspace-sidebar-nav relative z-10 flex-1 space-y-2 overflow-y-auto px-3.5 pb-5 scrollbar-thin" role="navigation" aria-label="Main navigation">
        <div className="px-3 pb-2 flex items-center justify-between">
          <p className="workspace-sidebar-section-label">TEACHING</p>
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        </div>

        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={cn(
                'workspace-nav-link group relative flex items-center gap-3 px-3 text-sm font-medium transition-all duration-200 select-none',
                isActive
                  ? 'text-text-primary font-bold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <motion.div
                  layoutId="activeLecturerNavPill"
                  className="workspace-nav-active absolute inset-0 rounded-[0.85rem]"
                  transition={applyMotionPreference(reducedMotion, { type: 'spring', stiffness: 320, damping: 30 }, {})}
                />
              )}
              <div className={cn(
                'workspace-nav-icon relative z-10 flex items-center justify-center rounded-lg transition-colors duration-200',
                isActive ? 'workspace-nav-icon-active' : 'text-text-muted group-hover:text-primary'
              )}>
                <Icon className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
              </div>
              <span className="relative z-10">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Assigned Course Unit Badge */}
      <LecturerCourseUnitBadge />

      {/* Floating User Glass Profile Box */}
      <div className="workspace-sidebar-footer relative z-10 border-t p-3.5">
        <div className="workspace-sidebar-profile p-3 transition-colors duration-200">
          <div className="flex items-center gap-3">
            <div className="workspace-avatar relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl p-0.5 font-bold text-white shadow-md">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-surface font-black text-xs text-primary">
                <User className="h-4 w-4" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-text-primary truncate">{user?.full_name || 'Lecturer'}</p>
              <span className="workspace-role-label inline-flex items-center gap-1 text-[10px] font-semibold truncate">
                <Sparkles className="h-3 w-3" aria-hidden="true" /> Academic Faculty
              </span>
            </div>
          </div>

          <button
            onClick={signOut}
            className="workspace-signout mt-3 flex w-full items-center justify-center gap-2 border border-border/70 px-3 text-xs font-bold text-text-secondary active:scale-[0.98]"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function LecturerCourseUnitBadge() {
  const [courseUnit, setCourseUnit] = useState<{ code: string; name: string } | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    if (!user?.id) return
    const supabase = createClient()
    supabase
      .from('course_units')
      .select('code, name')
      .eq('lecturer_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setCourseUnit(data)
      })
  }, [user?.id])

  if (!courseUnit) return null

  return (
    <div className="relative z-10 mx-3.5 mb-3 rounded-2xl border border-primary/25 bg-primary-light/60 p-3 backdrop-blur-md shadow-sm">
      <p className="workspace-role-label mb-0.5 flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider">
        <BookCopy className="h-3 w-3" /> Assigned Unit
      </p>
      <p className="text-xs font-bold text-white truncate">{courseUnit.code} · {courseUnit.name}</p>
    </div>
  )
}

