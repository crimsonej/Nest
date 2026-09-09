'use client'

import { cn } from '@/lib/utils'
import { Bell, User, LogOut, Moon, Sun } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from './Button'
import { useTheme } from 'next-themes'

export function TopBar({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-20 h-16 bg-surface/80 backdrop-blur-md border-b border-border">
      <div className="flex h-full items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-4 lg:hidden">
          {children}
        </div>
        
        <div className="flex-1 lg:flex-none" />
        
        <div className="flex items-center gap-4">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          <button
            className="relative p-2 rounded-lg hover:bg-surface-hover transition-colors"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
          >
            <Bell className="h-5 w-5 text-text-secondary" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-danger" />
          </button>

          <div className="relative">
            <button
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-surface-hover transition-colors"
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

import { useState } from 'react'