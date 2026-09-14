'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Shield, User, ChevronUp, ChevronDown, Check, Sparkles } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import type { User as UserType } from '@/types'

export function DevProfileSwitcher() {
  const router = useRouter()
  const { user, refreshUser, setPreviewProfile } = useAuth()
  const supabase = createClient()

  const [isOpen, setIsOpen] = useState(false)
  const [accounts, setAccounts] = useState<UserType[]>([])
  const [loading, setLoading] = useState(false)
  const [switchingId, setSwitchingId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/accounts')
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json()
          setAccounts(data.accounts || [])
        }
      })
      .catch(() => undefined)
  }, [])

  async function handleSwitch(targetUser: UserType) {
    setSwitchingId(targetUser.id)
    setLoading(true)

    try {
      // Clear previous user session & cookies
      try { await supabase.auth.signOut() } catch {}

      const isCoordRole = targetUser.role === 'coordinator' || targetUser.status === 'coordinator'
      const password = isCoordRole ? 'NestCoordinator123!' : 'NestStudent123!'
      const { error } = await supabase.auth.signInWithPassword({
        email: targetUser.email,
        password,
      })
      if (error) {
        setPreviewProfile(targetUser)
      }

      await refreshUser()

      const isCoordinatorAccess = targetUser.role === 'coordinator' || targetUser.status === 'coordinator' || targetUser.status === 'selected_coordinator'
      const dest = isCoordinatorAccess ? '/coordinator/dashboard' : '/student/dashboard'
      window.location.href = dest
    } catch (err) {
      setPreviewProfile(targetUser)
      const isCoordinatorAccess = targetUser.role === 'coordinator' || targetUser.status === 'coordinator' || targetUser.status === 'selected_coordinator'
      const dest = isCoordinatorAccess ? '/coordinator/dashboard' : '/student/dashboard'
      window.location.href = dest
    } finally {
      setLoading(false)
      setSwitchingId(null)
    }
  }

  if (accounts.length === 0) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen && (
        <div className="mb-3 w-80 sm:w-96 rounded-2xl border border-border bg-surface/95 backdrop-blur-lg p-4 shadow-2xl animate-in slide-in-from-bottom-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">Dev Profile Switcher</h4>
                <p className="text-[11px] text-text-muted">Quick access to seeded profiles</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 text-text-muted hover:bg-surface-hover hover:text-text-primary"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
            {accounts.map((acc) => {
              const isActive = user?.id === acc.id || user?.email === acc.email
              const isCoordinator = acc.role === 'coordinator' || acc.status === 'coordinator' || acc.status === 'selected_coordinator'

              return (
                <button
                  key={acc.id}
                  onClick={() => handleSwitch(acc)}
                  disabled={loading}
                  className={`group flex w-full items-center justify-between rounded-xl border p-2.5 text-left transition-all ${
                    isActive
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-border/60 bg-surface/60 hover:border-primary/40 hover:bg-surface-hover'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                        isCoordinator ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      {isCoordinator ? <Shield className="h-4 w-4" /> : <User className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-semibold text-text-primary">{acc.full_name}</span>
                        {acc.status === 'selected_coordinator' && (
                          <span className="rounded-md bg-purple-500/10 px-1.5 py-0.5 text-[9px] font-bold text-purple-600 dark:text-purple-400">
                            SC
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[10px] text-text-muted">{acc.email}</p>
                    </div>
                  </div>

                  <div className="ml-2 flex shrink-0 items-center gap-1">
                    <span className="text-[10px] uppercase font-bold text-text-muted">
                      {isCoordinator ? 'Coord' : 'Student'}
                    </span>
                    {isActive && <Check className="h-4 w-4 text-primary" />}
                    {switchingId === acc.id && (
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary text-white px-4 py-2.5 shadow-lg hover:bg-primary-hover hover:shadow-xl transition-all"
      >
        <Users className="h-4 w-4" />
        <span className="text-xs font-semibold">Switch Account</span>
        {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
      </button>
    </div>
  )
}
