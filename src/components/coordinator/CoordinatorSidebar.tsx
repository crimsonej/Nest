'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Users, BookOpen, Settings, LogOut, Menu, X, BarChart3, Shield, FileText, Clock } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '../ui/Button'

const navigation = [
  { name: 'Overview', href: '/coordinator/dashboard', icon: LayoutDashboard },
  { name: 'Group Monitor', href: '/coordinator/groups', icon: Users },
  { name: 'Coursework Manager', href: '/coordinator/coursework', icon: BookOpen },
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
        className="lg:hidden fixed top-4 left-4 z-50 btn btn-outline"
        onClick={() => setMobileMenuOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-surface border-r border-border transform transition-transform duration-300 lg:translate-x-0',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Coordinator navigation"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between px-6 border-b border-border">
            <Link href="/coordinator/dashboard" className="font-semibold text-lg text-text-primary">
              NEST Admin
            </Link>
            <button
              className="lg:hidden p-1 rounded-lg hover:bg-surface-hover"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-1 p-4 overflow-y-auto" role="navigation" aria-label="Main navigation">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          <div className="border-t border-border p-4">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{user?.full_name}</p>
                <p className="text-xs text-text-muted truncate">Coordinator</p>
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

import { useState } from 'react'