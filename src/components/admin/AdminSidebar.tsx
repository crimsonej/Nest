'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { BookOpen, Building2, FileText, GraduationCap, LayoutDashboard, Layers3, LogOut, Menu, Settings, Shield, UserCheck, Users, X, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

const navigation = [
  { name: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Faculties', href: '/admin/faculties', icon: Building2 },
  { name: 'Courses', href: '/admin/courses', icon: BookOpen },
  { name: 'Course Units', href: '/admin/course-units', icon: Layers3 },
  { name: 'Lecturers', href: '/admin/lecturers', icon: UserCheck },
  { name: 'Students', href: '/admin/students', icon: GraduationCap },
  { name: 'Groups', href: '/admin/groups', icon: Users },
  { name: 'Reports', href: '/admin/reports', icon: FileText },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed left-4 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-surface text-text-primary shadow-lg lg:hidden"
        onClick={() => setMobileMenuOpen(true)}
        aria-label="Open administrator navigation"
      >
        <Menu className="h-5 w-5" />
      </motion.button>

      <aside
        className="fixed inset-y-0 left-0 z-40 hidden w-[17rem] flex-col border-r border-border bg-surface/95 text-text-primary backdrop-blur-2xl shadow-xl transition-colors duration-300 lg:flex"
        aria-label="Administrator navigation"
      >
        <SidebarContent pathname={pathname} user={user} signOut={signOut} />
      </aside>

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
              aria-label="Administrator mobile navigation"
            >
              <SidebarContent pathname={pathname} user={user} signOut={signOut} onClose={() => setMobileMenuOpen(false)} isMobile />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

function SidebarContent({ pathname, user, signOut, onClose, isMobile = false }: { pathname: string; user: any; signOut: () => void; onClose?: () => void; isMobile?: boolean }) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-surface text-text-primary transition-colors duration-300">
      {/* Decorative ambient glow Orbs inside sidebar */}
      <div className="pointer-events-none absolute -top-16 -left-16 h-48 w-48 rounded-full bg-rose-500/15 blur-3xl dark:bg-rose-600/20 html.mid:bg-rose-500/25" />
      <div className="pointer-events-none absolute top-1/2 -right-16 h-48 w-48 rounded-full bg-amber-500/15 blur-3xl dark:bg-amber-600/15 html.mid:bg-amber-500/20" />

      {/* Sidebar Header / Logo */}
      <div className="relative z-10 flex h-20 items-center justify-between border-b border-border px-5 backdrop-blur-md">
        <Link href="/admin/dashboard" onClick={onClose} className="flex items-center gap-3 group">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 via-rose-600 to-amber-600 p-0.5 shadow-lg shadow-rose-500/25 group-hover:scale-105 transition-transform duration-200">
            <Image src="/logo.png" alt="NEST Logo" width={36} height={36} className="rounded-[14px] shrink-0" />
          </div>
          <div>
            <strong className="block text-base tracking-[0.2em] font-extrabold text-text-primary">NEST</strong>
            <small className="block text-[10px] font-extrabold uppercase tracking-[0.16em] text-rose-600 dark:text-rose-400 html.mid:text-rose-300">Admin Portal</small>
          </div>
        </Link>
        {isMobile && (
          <button className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors" onClick={onClose} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="relative z-10 flex-1 space-y-1.5 overflow-y-auto px-3.5 py-5 scrollbar-thin" role="navigation" aria-label="Administrator workspace">
        <div className="px-3 pb-2 flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-muted">University Control</p>
          <span className="flex h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
        </div>

        {navigation.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'group relative flex items-center gap-3.5 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 select-none',
                active ? 'text-white font-bold' : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover hover:translate-x-0.5'
              )}
            >
              {active && (
                <motion.div
                  layoutId="activeAdminNavPill"
                  className="absolute inset-0 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 shadow-lg shadow-rose-500/30"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <div className={cn(
                'relative z-10 flex h-7 w-7 items-center justify-center rounded-xl transition-all duration-200',
                active ? 'bg-white/20 text-white shadow-sm' : 'text-text-muted group-hover:text-text-primary group-hover:scale-110'
              )}>
                <Icon className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
              </div>
              <span className="relative z-10">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Floating User Glass Profile Box */}
      <div className="relative z-10 border-t border-border p-3.5 backdrop-blur-md">
        <div className="rounded-2xl border border-border bg-surface-hover/60 p-3 shadow-sm backdrop-blur-xl transition-all duration-200 hover:border-rose-500/40">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 p-0.5 font-bold text-white shadow-md">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-rose-950/80 font-black text-xs text-rose-300">
                <Shield className="h-4 w-4" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-text-primary truncate">{user?.full_name || 'Administrator'}</p>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-600 dark:text-rose-400 html.mid:text-rose-300 truncate">
                <Sparkles className="h-3 w-3 text-amber-500" /> Super Admin
              </span>
            </div>
          </div>

          <button
            onClick={signOut}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold text-text-secondary hover:bg-rose-500/20 hover:border-rose-500/40 hover:text-rose-600 dark:hover:text-rose-300 transition-all duration-200 active:scale-[0.98]"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  )
}