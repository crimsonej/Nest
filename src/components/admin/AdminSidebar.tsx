'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { BookOpen, Building2, FileText, GraduationCap, LayoutDashboard, Layers3, LogOut, Menu, Settings, Shield, Users, X } from 'lucide-react'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

const navigation = [
  { name: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Faculties', href: '/admin/faculties', icon: Building2 },
  { name: 'Courses', href: '/admin/courses', icon: BookOpen },
  { name: 'Course Units', href: '/admin/course-units', icon: Layers3 },
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
      <button
        className="fixed left-4 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-surface text-text-primary shadow-md lg:hidden"
        onClick={() => setMobileMenuOpen(true)}
        aria-label="Open administrator navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[17rem] flex-col border-r border-white/10 bg-[#10251f] text-white lg:flex" aria-label="Administrator navigation">
        <SidebarContent pathname={pathname} user={user} signOut={signOut} />
      </aside>

      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
            <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} className="fixed inset-y-0 left-0 z-50 w-[17rem] bg-[#10251f] text-white shadow-2xl lg:hidden">
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
    <div className="flex h-full flex-col">
      <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
        <Link href="/admin/dashboard" onClick={onClose} className="flex items-center gap-3 text-white">
          <Image src="/logo.png" alt="NEST Logo" width={40} height={40} className="rounded-2xl" />
          <div><strong className="block text-base tracking-[0.18em]">NEST</strong><small className="block text-[10px] font-bold uppercase tracking-[0.14em] opacity-75">Admin Portal</small></div>
        </Link>
        {isMobile && <button className="p-2 text-white/70" onClick={onClose} aria-label="Close menu"><X className="h-5 w-5" /></button>}
      </div>
      <nav className="flex-1 space-y-1.5 px-4 py-6" aria-label="Administrator workspace">
        <p className="px-3 pb-3 text-[11px] font-bold uppercase tracking-[0.16em] opacity-60">University control</p>
        {navigation.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return <Link key={item.href} href={item.href} onClick={onClose} className={cn('relative flex items-center gap-3.5 rounded-2xl px-3.5 py-3 text-sm font-semibold', active ? 'bg-emerald-500 text-white' : 'opacity-75 hover:bg-white/10 hover:opacity-100')}><Icon className="h-5 w-5" /><span>{item.name}</span></Link>
        })}
      </nav>
      <div className="border-t border-white/10 bg-black/10 p-4">
        <div className="flex items-center gap-3 px-3 py-2"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-emerald-300"><Shield className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{user?.full_name}</p><p className="truncate text-[11px] opacity-70">Administrator</p></div></div>
        <button onClick={signOut} className="mt-3 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold opacity-75 hover:bg-white/10 hover:opacity-100"><LogOut className="h-4 w-4" />Sign out</button>
      </div>
    </div>
  )
}