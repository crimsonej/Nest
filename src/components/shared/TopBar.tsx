'use client'

import { cn } from '@/lib/utils'
import { useState } from 'react'
import { User, LogOut, ChevronDown, MapPin, Sparkles, ArrowLeftRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import ThemeToggle from './ThemeToggle'
import { motion, AnimatePresence } from 'framer-motion'

export function TopBar({ role, onSwitchWorkspace }: { role: 'student' | 'coordinator' | 'admin' | 'lecturer'; onSwitchWorkspace?: () => void }) {
  const { user, signOut } = useAuth()
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-surface/70 backdrop-blur-2xl transition-colors duration-300 shadow-xs">
      <div className="mx-auto flex min-h-16 w-full max-w-[1600px] items-center justify-between gap-1.5 pl-14 pr-2.5 py-2 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="hidden h-6 w-px bg-border/80 sm:block" />
          <div className="min-w-0 truncate">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-primary" />
              </span>
              <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.14em] text-primary truncate max-w-[110px] xs:max-w-[180px] sm:max-w-none">
                {role === 'student' ? 'Student Workspace' : role === 'admin' ? 'Admin Workspace' : role === 'lecturer' ? 'Lecturer Workspace' : 'Coordinator Workspace'}
              </p>
            </div>
            <p className="mt-0.5 hidden max-w-[42rem] text-xs font-medium text-text-secondary md:block">
              {role === 'student' ? 'Stay on top of your coursework and group collaboration' : role === 'admin' ? 'University-wide overview across faculties and academic data' : role === 'lecturer' ? 'View your assigned course unit — groups, students, and reports' : 'Real-time overview of courses, groups, and assignments'}
            </p>
          </div>
          <div className="hidden items-center gap-1.5 rounded-full border border-primary/20 bg-primary-light/40 px-3 py-1 text-[11px] font-bold text-primary backdrop-blur-md lg:flex shrink-0 shadow-xs">
            <MapPin className="h-3 w-3 text-primary" />Kampala Campus
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />

          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-2 rounded-2xl border border-border/80 bg-surface/90 p-1.5 pr-3 shadow-xs backdrop-blur-md hover:border-primary/40 transition-all"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              aria-label="User menu"
              aria-expanded={userMenuOpen}
            >
              <div className="h-7 w-7 overflow-hidden rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 p-[1.5px] shadow-sm">
                <div className="h-full w-full rounded-[10px] bg-surface flex items-center justify-center text-primary font-black text-xs">
                  {user?.full_name ? user.full_name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
                </div>
              </div>
              <span className="hidden sm:block text-xs font-bold text-text-primary truncate max-w-[120px]">
                {user?.full_name}
              </span>
              <ChevronDown className={`hidden h-3.5 w-3.5 text-text-muted transition-transform duration-200 sm:block ${userMenuOpen ? 'rotate-180' : ''}`} />
            </motion.button>

            <AnimatePresence>
              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setUserMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                    className="absolute right-0 mt-2 w-56 rounded-2xl border border-border/80 bg-surface shadow-xl py-2 z-20 backdrop-blur-xl overflow-hidden"
                  >
                    <div className="px-4 py-2.5 border-b border-border/60 bg-surface-hover/30">
                      <p className="text-xs font-bold text-text-primary truncate">{user?.full_name}</p>
                      <p className="text-[11px] text-text-muted truncate mt-0.5">{user?.email}</p>
                    </div>
                    <div className="p-1">
                      {onSwitchWorkspace && (
                        <button
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-text-primary hover:bg-surface-hover transition-colors"
                          onClick={() => {
                            setUserMenuOpen(false)
                            onSwitchWorkspace()
                          }}
                        >
                          <ArrowLeftRight className="h-4 w-4 text-primary" />
                          Switch workspace
                        </button>
                      )}
                      <button
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-danger hover:bg-danger-light/50 transition-colors"
                        onClick={signOut}
                      >
                        <LogOut className="h-4 w-4" />
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