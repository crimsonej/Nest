'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LogIn, MoonStar, SunMedium, Sparkles, User, Shield, CheckCircle2, AlertCircle } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { createClient } from '@/lib/supabase/client'
import { isLocalDataMode } from '@/lib/local-data'
import { useAuth } from '@/hooks/useAuth'
import type { User as UserType } from '@/types'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { setPreviewProfile, refreshUser } = useAuth()
  const { resolvedTheme, setTheme } = useTheme()

  const [accounts, setAccounts] = useState<UserType[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState('')
  const [authMode, setAuthMode] = useState<'auth' | 'preview'>('auth')

  useEffect(() => {
    fetch('/api/auth/accounts')
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Unable to load accounts')
        const list: UserType[] = result.accounts || []
        setAccounts(list)
        if (list.length > 0) {
          setSelectedAccountId(list[0].id)
        }
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load profiles'))
      .finally(() => setLoadingAccounts(false))
  }, [])

  function cycleTheme() {
    const order = ['light', 'mid', 'dark'] as const
    const current = (resolvedTheme as (typeof order)[number]) || 'light'
    const index = order.indexOf(current)
    setTheme(order[(index + 1) % order.length])
  }

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0]

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedAccount) {
      setError('Please select a profile to sign in.')
      return
    }

    setSigningIn(true)
    setError('')

    try {
      // Clear any stale auth tokens from prior dev sessions
      await supabase.auth.signOut().catch(() => {})

      if (isLocalDataMode()) {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('nest-local-user-id', selectedAccount.id)
          window.localStorage.setItem('nest-preview-profile', JSON.stringify(selectedAccount))
        }
      } else {
        // Try Supabase auth with role-based password
        const pass = selectedAccount.role === 'coordinator' ? 'NestCoordinator123!' : 'NestStudent123!'
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: selectedAccount.email,
          password: pass,
        })

        if (signInError) {
          console.warn('Supabase auth failed, using preview mode:', signInError.message)
          setAuthMode('preview')
        } else {
          setAuthMode('auth')
        }
      }

      // Set preview profile in localStorage and context
      setPreviewProfile(selectedAccount)

      // Set cookies so middleware can identify the user server-side
      document.cookie = `nest-preview-user-id=${selectedAccount.id}; path=/; max-age=86400; SameSite=Lax`
      document.cookie = `nest-preview-role=${selectedAccount.role}; path=/; max-age=86400; SameSite=Lax`
      document.cookie = `nest-preview-status=${selectedAccount.status}; path=/; max-age=86400; SameSite=Lax`

      const redirect = searchParams.get('redirect')
      const isCoord = selectedAccount.role === 'coordinator' || selectedAccount.status === 'coordinator' || selectedAccount.status === 'selected_coordinator'
      const destination = redirect?.startsWith('/') ? redirect : isCoord ? '/coordinator/dashboard' : '/student/dashboard'

      // Top-level navigation to send new cookies in request headers
      window.location.href = destination
    } catch (err) {
      setError('Failed to sign in. Please try again.')
      console.error('Login error:', err)
    } finally {
      setSigningIn(false)
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-6">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">NEST Access Portal</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-text-primary">Sign in to NEST</h1>
          <p className="mt-1 text-sm text-text-secondary">Select your account profile to open your workspace.</p>
        </div>
        <button
          type="button"
          onClick={cycleTheme}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-text-secondary transition hover:text-text-primary"
          aria-label="Switch theme"
          title="Switch theme"
        >
          {resolvedTheme === 'dark' ? <SunMedium className="h-4 w-4" /> : resolvedTheme === 'mid' ? <Sparkles className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
        </button>
      </div>

      {error && <p className="rounded-xl border border-danger/20 bg-danger-light p-4 text-sm text-danger" role="alert">{error}</p>}

      <div className="space-y-4">
        <Select
          label="Choose Account Profile"
          options={accounts.map((acc) => ({
            value: acc.id,
            label: `${acc.full_name} (${acc.role === 'coordinator' ? 'Coordinator' : 'Student'}${acc.status === 'selected_coordinator' ? ' - SC' : ''})`,
          }))}
          value={selectedAccountId}
          onChange={setSelectedAccountId}
          placeholder={loadingAccounts ? 'Loading database profiles...' : 'Select a profile'}
          disabled={loadingAccounts || signingIn}
        />

        {selectedAccount && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${selectedAccount.role === 'coordinator' ? 'bg-amber-500/20 text-amber-600' : 'bg-blue-500/20 text-blue-600'}`}>
                  {selectedAccount.role === 'coordinator' ? <Shield className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-text-primary">{selectedAccount.full_name}</h4>
                  <p className="text-xs text-text-muted">{selectedAccount.email}</p>
                </div>
              </div>
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>

            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-text-secondary pt-1 border-t border-primary/10">
              <span className="rounded-md bg-surface px-2 py-0.5 border border-border">University: {selectedAccount.university || 'Ndejje University'}</span>
              {selectedAccount.student_registration_number && (
                <span className="rounded-md bg-surface px-2 py-0.5 border border-border">Reg: {selectedAccount.student_registration_number}</span>
              )}
            </div>
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" loading={signingIn} disabled={loadingAccounts || !selectedAccountId}>
          <LogIn className="h-4 w-4 mr-2" />
          Log In as {selectedAccount?.full_name?.split(' ')[0] || 'Selected Profile'}
        </Button>
      </div>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<div className="text-sm text-text-secondary">Loading profiles...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}