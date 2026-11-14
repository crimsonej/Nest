'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { User, LogOut, ChevronDown, MapPin, ArrowLeftRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import ThemeToggle from './ThemeToggle'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion, applyMotionPreference } from '@/lib/animation'

const menuItemClasses =
  'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'

export function TopBar({ role, onSwitchWorkspace }: { role: 'student' | 'coordinator' | 'admin' | 'lecturer'; onSwitchWorkspace?: () => void }) {
  const { user, signOut } = useAuth()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const reducedMotion = useReducedMotion()
  const menuId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  function closeMenu(returnFocus = true) {
    setUserMenuOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }

  // Move focus into the menu when it opens, and support Escape / arrow keys / Tab-out.
  useEffect(() => {
    if (!userMenuOpen) return
    const items = () => Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') || [])
    requestAnimationFrame(() => items()[0]?.focus())

    function onKeyDown(event: KeyboardEvent) {
      const list = items()
      const index = list.indexOf(document.activeElement as HTMLButtonElement)
      if (event.key === 'Escape') {
        event.preventDefault()
        closeMenu()
      } else if (event.key === 'ArrowDown') {
        event.preventDefault()
        list[(index + 1) % list.length]?.focus()
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        list[(index - 1 + list.length) % list.length]?.focus()
      } else if (event.key === 'Tab') {
        closeMenu(false)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [userMenuOpen])

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-surface/70 backdrop-blur-2xl transition-colors duration-300 shadow-xs">
      <div className="mx-auto flex min-h-16 w-full max-w-[1600px] items-center gap-2 px-2.5 py-2 pl-14 sm:justify-between sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <div className="hidden h-6 w-px bg-border/80 sm:block" aria-hidden="true" />
          <div className="min-w-0 truncate">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0" aria-hidden="true">
                <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-primary" />
              </span>
              <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.14em] text-primary truncate max-w-[110px] xs:max-w-[180px] sm:max-w-none">
                {role === 'student' ? 'Student Workspace' : role === 'admin' ? 'Admin Workspace' : role === 'lecturer' ? 'Lecturer Workspace' : 'Coordinator Workspace'}
              </p>
            </div>
            <p className="mt-0.5 hidden max-w-[42rem] truncate text-xs font-medium text-text-secondary xl:block">
              {role === 'student' ? 'Stay on top of your coursework and group collaboration' : role === 'admin' ? 'University-wide overview across faculties and academic data' : role === 'lecturer' ? 'View your assigned course unit — groups, students, and reports' : 'Real-time overview of courses, groups, and assignments'}
            </p>
          </div>
          <div className="hidden shrink-0 items-center gap-1.5 rounded-full border border-primary/20 bg-primary-light/40 px-3 py-1 text-[11px] font-bold text-primary shadow-xs backdrop-blur-md 2xl:flex">
            <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />Kampala Campus
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <ThemeToggle />

          <div className="relative">
            <motion.button
              ref={triggerRef}
              type="button"
              whileHover={applyMotionPreference(reducedMotion, { scale: 1.03 }, {})}
              whileTap={applyMotionPreference(reducedMotion, { scale: 0.96 }, {})}
              className="flex items-center gap-2 rounded-2xl border border-border/80 bg-surface/90 p-1.5 pr-3 shadow-xs backdrop-blur-md hover:border-primary/40 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => setUserMenuOpen((open) => !open)}
              aria-label={`Account menu for ${user?.full_name || 'your account'}`}
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
              aria-controls={userMenuOpen ? menuId : undefined}
            >
              <div className="workspace-avatar h-7 w-7 overflow-hidden rounded-xl p-[1.5px] shadow-sm" aria-hidden="true">
                <div className="h-full w-full rounded-[10px] bg-surface flex items-center justify-center text-primary font-black text-xs">
                  {user?.full_name ? user.full_name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
                </div>
              </div>
              <span className="hidden sm:block text-xs font-bold text-text-primary truncate max-w-[120px]">
                {user?.full_name}
              </span>
              <ChevronDown className={`hidden h-4 w-4 text-text-muted transition-transform duration-200 sm:block ${userMenuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </motion.button>

            <AnimatePresence>
              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => closeMenu(false)}
                    onTouchStart={() => closeMenu(false)}
                    aria-hidden="true"
                  />
                  <motion.div
                    ref={menuRef}
                    id={menuId}
                    role="menu"
                    aria-label="Account"
                    initial={applyMotionPreference(reducedMotion, { opacity: 0, scale: 0.95, y: -10 }, { opacity: 0 })}
                    animate={applyMotionPreference(reducedMotion, { opacity: 1, scale: 1, y: 0 }, { opacity: 1 })}
                    exit={applyMotionPreference(reducedMotion, { opacity: 0, scale: 0.95, y: -10 }, { opacity: 0 })}
                    transition={applyMotionPreference(reducedMotion, { type: 'spring', stiffness: 450, damping: 30 }, { duration: 0 })}
                    className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-border/80 bg-surface shadow-xl py-2 z-20 backdrop-blur-xl overflow-hidden"
                  >
                    <div className="px-4 py-2.5 border-b border-border/60 bg-surface-hover/30">
                      <p className="text-xs font-bold text-text-primary truncate">{user?.full_name}</p>
                      <p className="text-[11px] text-text-muted truncate mt-0.5">{user?.email}</p>
                    </div>
                    <div className="p-1">
                      {onSwitchWorkspace && (
                        <button
                          type="button"
                          role="menuitem"
                          className={`${menuItemClasses} text-text-primary hover:bg-surface-hover`}
                          onClick={() => {
                            closeMenu(false)
                            onSwitchWorkspace()
                          }}
                        >
                          <ArrowLeftRight className="h-4 w-4 text-primary" aria-hidden="true" />
                          Switch workspace
                        </button>
                      )}
                      <button
                        type="button"
                        role="menuitem"
                        className={`${menuItemClasses} text-danger hover:bg-danger-light/50`}
                        onClick={signOut}
                      >
                        <LogOut className="h-4 w-4" aria-hidden="true" />
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  )
}
