'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Users, BookOpen, Settings, LogOut, Menu, X, Shield, FileText, Sparkles, Bot } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '../ui/Button'

const navigation = [
  { name: 'Overview', href: '/coordinator/dashboard', icon: LayoutDashboard },
  { name: 'Group Monitor', href: '/coordinator/groups', icon: Users },
  { name: 'Coursework Manager', href: '/coordinator/coursework', icon: BookOpen },
  { name: 'AI Entry (Crimson)', href: '/coordinator/ai-entry', icon: Bot },
  { name: 'Interventions', href: '/coordinator/interventions', icon: Shield },
  { name: 'Reports', href: '/coordinator/reports', icon: FileText },
  { name: 'Settings', href: '/coordinator/settings', icon: Settings },
]

export function CoordinatorSidebar() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      <button
        className="fixed left-4 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-text-primary shadow-sm lg:hidden"
        onClick={() => setMobileMenuOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <aside
        className={cn(
          'rail-sheen fixed inset-y-0 left-0 z-40 w-[17rem] transform border-r border-[#43534d] bg-[#20312d] text-[#f4f1e9] transition-transform duration-300 lg:translate-x-0',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Coordinator navigation"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-20 items-center justify-between border-b border-white/10 px-5">
            <Link href="/coordinator/dashboard" className="flex items-center gap-3 text-[#f4f1e9]">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-sm"><Sparkles className="h-4 w-4" /></span>
              <span><strong className="block text-base tracking-[0.16em]">NEST</strong><small className="block text-[10px] font-medium uppercase tracking-[0.12em] text-[#a7b6ad]">Coordinator portal</small></span>
            </Link>
            <button
              className="lg:hidden p-1 rounded-lg hover:bg-surface-hover"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6" role="navigation" aria-label="Main navigation">
            <p className="px-3 pb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#91a39a]">Workspace</p>
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-white/10 text-white before:absolute before:left-0 before:h-6 before:w-1 before:rounded-r-full before:bg-primary'
                      : 'text-[#b7c4bc] hover:bg-white/5 hover:text-white'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          <div className="border-t border-white/10 p-4">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
                <Shield className="h-4 w-4 text-[#f0a35b]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
                <p className="text-xs text-[#9eaea5] truncate">Coordinator</p>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-3" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  )
}