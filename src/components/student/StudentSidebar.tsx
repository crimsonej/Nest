'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Users, BookOpen, Settings, LogOut, Menu, X, User, ListChecks, Sparkles } from 'lucide-react'
import Image from 'next/image'
import { useAuth } from '@/hooks/useAuth'
import { motion, AnimatePresence } from 'framer-motion'

const navigation = [
  { name: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
  { name: 'My Groups', href: '/student/groups', icon: Users },
  { name: 'Coursework', href: '/student/coursework', icon: BookOpen },
  { name: 'Tasks & deadlines', href: '/student/tasks', icon: ListChecks },
  { name: 'Settings', href: '/student/settings', icon: Settings },
]

export function StudentSidebar() {
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
        aria-label="Student navigation"
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
              aria-label="Student mobile navigation"
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
      <div className="pointer-events-none absolute -top-16 -left-16 h-48 w-48 rounded-full bg-indigo-500/15 blur-3xl dark:bg-indigo-600/20 html.mid:bg-rose-500/20" />
      <div className="pointer-events-none absolute top-1/2 -right-16 h-48 w-48 rounded-full bg-violet-500/15 blur-3xl dark:bg-violet-600/15 html.mid:bg-amber-500/15" />

      {/* Sidebar Header / Logo */}
      <div className="relative z-10 flex h-20 items-center justify-between border-b border-border px-5 backdrop-blur-md">
        <Link href="/student/dashboard" onClick={onClose} className="flex items-center gap-3 group">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 p-0.5 shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-200">
            <Image src="/logo.png" alt="NEST Logo" width={36} height={36} className="rounded-[14px] shrink-0" />
          </div>
          <div>
            <strong className="block text-base tracking-[0.2em] font-extrabold text-text-primary">NEST</strong>
            <small className="block text-[10px] font-extrabold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400 html.mid:text-rose-400">Student Portal</small>
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
          <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
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
                  layoutId="activeStudentNavPill"
                  className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30"
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

      {/* Floating User Glass Profile Box */}
      <div className="relative z-10 border-t border-border p-3.5 backdrop-blur-md">
        <div className="rounded-2xl border border-border bg-surface-hover/60 p-3 shadow-sm backdrop-blur-xl transition-all duration-200 hover:border-primary/40">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 p-0.5 font-bold text-white shadow-md">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-surface font-black text-xs text-indigo-600 dark:text-indigo-300">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-text-primary truncate">{user?.full_name || 'Student'}</p>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 html.mid:text-rose-400 truncate">
                <Sparkles className="h-3 w-3" /> Active Account
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