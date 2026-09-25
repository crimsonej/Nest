'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { FileText, Users, GraduationCap, LogOut, Menu, X, BookCopy, Sparkles, User } from 'lucide-react'
import Image from 'next/image'
import { useAuth } from '@/hooks/useAuth'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

const navigation = [
  { name: 'Reports', href: '/lecturer/reports', icon: FileText },
  { name: 'Courseworks', href: '/lecturer/courseworks', icon: BookCopy },
  { name: 'Groups', href: '/lecturer/groups', icon: Users },
  { name: 'Students', href: '/lecturer/students', icon: GraduationCap },
]

export function LecturerSidebar() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      {/* Mobile Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed left-4 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-surface text-text-primary shadow-lg lg:hidden"
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
        <SidebarContent pathname={pathname} user={user} signOut={signOut} onClose={() => {}} />
      </aside>

      {/* Mobile Drawer Slide-in */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 w-[17rem] border-r border-border bg-surface text-text-primary shadow-2xl lg:hidden"
              aria-label="Lecturer mobile navigation"
            >
              <SidebarContent pathname={pathname} user={user} signOut={signOut} onClose={() => setMobileMenuOpen(false)} isMobile />
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
  onClose,
  isMobile = false,
}: {
  pathname: string
  user: any
  signOut: () => void
  onClose: () => void
  isMobile?: boolean
}) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-surface text-text-primary transition-colors duration-300">
      {/* Decorative ambient glow Orbs inside sidebar */}
      <div className="pointer-events-none absolute -top-16 -left-16 h-48 w-48 rounded-full bg-violet-500/15 blur-3xl dark:bg-violet-600/20 html.mid:bg-rose-500/20" />
      <div className="pointer-events-none absolute top-1/2 -right-16 h-48 w-48 rounded-full bg-purple-500/15 blur-3xl dark:bg-purple-600/15 html.mid:bg-amber-500/15" />

      {/* Sidebar Header / Logo */}
      <div className="relative z-10 flex h-20 items-center justify-between border-b border-border px-5 backdrop-blur-md">
        <Link href="/lecturer/reports" onClick={onClose} className="flex items-center gap-3 group">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-600 p-0.5 shadow-lg shadow-purple-500/25 group-hover:scale-105 transition-transform duration-200">
            <Image src="/logo.png" alt="NEST Logo" width={36} height={36} className="rounded-[14px] shrink-0" />
          </div>
          <div>
            <strong className="block text-base tracking-[0.2em] font-extrabold text-text-primary">NEST</strong>
            <small className="block text-[10px] font-extrabold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-400 html.mid:text-rose-400">Lecturer Portal</small>
          </div>
        </Link>
        {isMobile && (
          <button
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="relative z-10 flex-1 space-y-1.5 overflow-y-auto px-3.5 py-5 scrollbar-thin" role="navigation" aria-label="Main navigation">
        <div className="px-3 pb-2 flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-muted">Workspace</p>
          <span className="flex h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
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
                'group relative flex items-center gap-3.5 rounded-2xl px-3.5 py-3 text-sm font-semibold transition-all duration-200 select-none',
                isActive
                  ? 'text-white font-bold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover hover:translate-x-0.5'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <motion.div
                  layoutId="activeLecturerNavPill"
                  className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 shadow-lg shadow-purple-500/30"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <div className={cn(
                'relative z-10 flex h-7 w-7 items-center justify-center rounded-xl transition-all duration-200',
                isActive ? 'bg-white/20 text-white shadow-sm' : 'text-text-muted group-hover:text-text-primary group-hover:scale-110'
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
      <div className="relative z-10 border-t border-border p-3.5 backdrop-blur-md">
        <div className="rounded-2xl border border-border bg-surface-hover/60 p-3 shadow-sm backdrop-blur-xl transition-all duration-200 hover:border-primary/40">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 p-0.5 font-bold text-white shadow-md">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-surface font-black text-xs text-violet-600 dark:text-violet-300">
                <User className="h-4 w-4" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-text-primary truncate">{user?.full_name || 'Lecturer'}</p>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-600 dark:text-violet-400 html.mid:text-rose-400 truncate">
                <Sparkles className="h-3 w-3" /> Academic Faculty
              </span>
            </div>
          </div>

          <button
            onClick={signOut}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold text-text-secondary hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-600 dark:hover:text-rose-400 transition-all duration-200 active:scale-[0.98]"
          >
            <LogOut className="h-3.5 w-3.5" />
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
    <div className="relative z-10 mx-3.5 mb-3 rounded-2xl border border-purple-500/30 bg-purple-500/15 p-3 backdrop-blur-md shadow-lg shadow-purple-950/40">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-purple-300 mb-0.5 flex items-center gap-1">
        <BookCopy className="h-3 w-3 text-purple-400" /> Assigned Unit
      </p>
      <p className="text-xs font-bold text-white truncate">{courseUnit.code} · {courseUnit.name}</p>
    </div>
  )
}

