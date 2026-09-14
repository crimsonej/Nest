'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Users, BookOpen, Settings, LogOut, Menu, X, Shield, FileText, Bot, GraduationCap, Layers3, BookCopy } from 'lucide-react'
import Image from 'next/image'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '../ui/Button'
import { motion, AnimatePresence } from 'framer-motion'

const navigation = [
  { name: 'Overview', href: '/coordinator/dashboard', icon: LayoutDashboard },
  { name: 'Students', href: '/coordinator/students', icon: GraduationCap },
  { name: 'Courses', href: '/coordinator/courses', icon: Layers3 },
  { name: 'Course Units', href: '/coordinator/course-units', icon: BookCopy },
  { name: 'Groups', href: '/coordinator/groups', icon: Users },
  { name: 'Course Work', href: '/coordinator/coursework', icon: BookOpen },
  { name: 'AI Entry (Crimson)', href: '/coordinator/ai-entry', icon: Bot },
  { name: 'Reports', href: '/coordinator/reports', icon: FileText },
  { name: 'Settings', href: '/coordinator/settings', icon: Settings },
]

export function CoordinatorSidebar() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      {/* Mobile Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed left-4 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-surface text-text-primary shadow-md lg:hidden"
        onClick={() => setMobileMenuOpen(true)}
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </motion.button>

      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-[17rem] flex-col border-r border-[#1e293b] bg-[#0f172a] text-slate-100 transition-colors duration-300 dark:bg-[#030712] dark:border-[#111827]"
        style={{
          backgroundColor: 'var(--sidebar-bg)',
          borderColor: 'var(--sidebar-border)',
          color: 'var(--sidebar-text)',
        }}
        aria-label="Coordinator navigation"
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
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 w-[17rem] border-r border-white/10 bg-[#0f172a] text-white shadow-2xl lg:hidden"
              style={{
                backgroundColor: 'var(--sidebar-bg)',
                borderColor: 'var(--sidebar-border)',
                color: 'var(--sidebar-text)',
              }}
              aria-label="Coordinator mobile navigation"
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
    <div className="flex h-full flex-col">
      <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
        <Link href="/coordinator/dashboard" onClick={onClose} className="flex items-center gap-3 text-white">
          <Image src="/logo.png" alt="NEST Logo" width={40} height={40} className="rounded-2xl shrink-0" />
          <div>
            <strong className="block text-base tracking-[0.18em] font-extrabold">NEST</strong>
            <small className="block text-[10px] font-bold uppercase tracking-[0.14em] opacity-75">Coordinator Portal</small>
          </div>
        </Link>
        {isMobile && (
          <button
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto px-4 py-6 scrollbar-thin" role="navigation" aria-label="Main navigation">
        <p className="px-3 pb-3 text-[11px] font-bold uppercase tracking-[0.16em] opacity-60">Workspace</p>
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={cn(
                'relative flex items-center gap-3.5 rounded-2xl px-3.5 py-3 text-sm font-semibold transition-all duration-200 select-none',
                isActive
                  ? 'text-white font-bold shadow-sm'
                  : 'opacity-75 hover:opacity-100 hover:bg-white/10'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <motion.div
                  layoutId="activeCoordNavPill"
                  className="absolute inset-0 rounded-2xl bg-primary shadow-md shadow-primary/30"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <Icon className="relative z-10 h-5 w-5 flex-shrink-0" aria-hidden="true" />
              <span className="relative z-10">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-white/10 p-4 bg-black/10">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center font-bold text-amber-400">
            <Shield className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{user?.full_name}</p>
            <p className="text-[11px] opacity-70 truncate">Coordinator</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-3 border-white/20 text-white hover:bg-white/10 bg-transparent"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}