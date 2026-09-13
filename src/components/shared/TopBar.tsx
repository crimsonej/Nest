'use client'

import { cn } from '@/lib/utils'
import { useState } from 'react'
import { Bell, User, LogOut, Moon, Sun, ChevronDown, Sparkles, MapPin, Radio } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '../ui/Button'
import ThemeToggle from './ThemeToggle'

export function TopBar({ role }: { role: 'student' | 'coordinator' }) {
  const { user, signOut } = useAuth()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-background/75 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <div className="hidden h-8 w-px bg-border sm:block" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">{role === 'student' ? 'Student workspace' : 'Coordinator workspace'}</p>
            <p className="mt-0.5 hidden text-sm font-medium text-text-primary sm:block">{role === 'student' ? 'Stay on top of your group work' : 'A clear view of course activity'}</p>
          </div>
          <div className="hidden items-center gap-1.5 rounded-full border border-border bg-surface/70 px-2.5 py-1 text-[11px] font-medium text-text-muted md:flex"><MapPin className="h-3 w-3 text-primary" />Kampala Campus</div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          <button
            className="relative flex h-10 w-10 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
          >
            <Bell className="h-5 w-5 text-text-secondary" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-danger" />
          </button>

          <div className="relative">
            <button
              className="flex items-center gap-2 rounded-xl p-1.5 transition-colors hover:bg-surface-hover"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              aria-label="User menu"
              aria-expanded={userMenuOpen}
            >
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <span className="hidden sm:block text-sm font-medium text-text-primary">
                {user?.full_name}
              </span>
              <ChevronDown className="hidden h-4 w-4 text-text-muted sm:block" />
            </button>

            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setUserMenuOpen(false)}
                  aria-hidden="true"
                />
                <div className="absolute right-0 mt-2 w-48 rounded-lg border border-border bg-surface shadow-lg py-1 z-20 animate-fade-in">
                  <div className="px-4 py-2 border-b border-border">
                    <p className="text-sm font-medium text-text-primary">{user?.full_name}</p>
                    <p className="text-xs text-text-muted truncate">{user?.email}</p>
                  </div>
                  <button
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                    onClick={signOut}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}