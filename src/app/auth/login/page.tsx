'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { LogIn, MoonStar, SunMedium, Sparkles } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { createClient } from '@/lib/supabase/client'
import { isLocalDataMode } from '@/lib/local-data'
import type { User } from '@/types'

type AccountOption = User

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { resolvedTheme, setTheme } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [accounts, setAccounts] = useState<AccountOption[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [autoSigningIn, setAutoSigningIn] = useState(true)
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/auth/auto-login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ role: 'student' }) })
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) {
          if (result.error && !result.error.includes('development')) setError(`Backend sign-in unavailable: ${result.error}`)
          return
        }
        if (isLocalDataMode() && result.email) {
          await supabase.auth.signInWithPassword({ email: result.email, password: 'local-demo' })
        }
        const redirect = searchParams.get('redirect')
        const destination = redirect?.startsWith('/') ? redirect : result.role === 'student' ? '/student/dashboard' : '/coordinator/dashboard'
        router.push(destination)
        router.refresh()
      })
      .catch(() => undefined)
      .finally(() => setAutoSigningIn(false))

    fetch('/api/auth/accounts')
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Unable to load preview profiles')
        setAccounts(result.accounts)
        setSelectedAccountId(result.accounts[0]?.id || '')
        setEmail(result.accounts[0]?.email || '')
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load preview profiles'))
      .finally(() => setLoadingAccounts(false))
  }, [router, searchParams])

  function selectAccount(accountId: string) {
    setSelectedAccountId(accountId)
    setEmail(accounts.find((account) => account.id === accountId)?.email || '')
  }

  function cycleTheme() {
    const order = ['light', 'mid', 'dark'] as const
    const current = (resolvedTheme as (typeof order)[number]) || 'light'
    const index = order.indexOf(current)
    setTheme(order[(index + 1) % order.length])
  }

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSigningIn(true)
    setError('')

    try {
      const selectedAccount = accounts.find((account) => account.id === selectedAccountId)
      const loginEmail = (selectedAccount?.email || email).trim()

      if (!loginEmail || !password.trim()) {
        throw new Error('Enter the profile email and password to sign in.')
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: loginEmail, password })
      if (signInError) {
        throw signInError
      }

      if (!data.user) throw new Error('Unable to sign in.')
      const { data: profile, error: profileError } = await supabase.from('users').select('role').eq('id', data.user.id).single()
      if (profileError) throw profileError
      const redirect = searchParams.get('redirect')
      const destination = redirect?.startsWith('/') ? redirect : profile.role === 'student' ? '/student/dashboard' : '/coordinator/dashboard'
      router.push(destination)
      router.refresh()
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : 'Unable to sign in.')
    } finally {
      setSigningIn(false)
    }
  }

  return (
    <form onSubmit={signIn} className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Secure sign in</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-text-primary">Welcome back</h1>
          <p className="mt-3 max-w-md leading-7 text-text-secondary">Sign in to your NEST student or coordinator workspace.</p>
        </div>
        <button
          type="button"
          onClick={cycleTheme}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface text-text-secondary transition hover:text-text-primary"
          aria-label="Switch theme"
          title="Switch theme"
        >
          {resolvedTheme === 'dark' ? <SunMedium className="h-4 w-4" /> : resolvedTheme === 'mid' ? <Sparkles className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="rounded-xl border border-danger/20 bg-danger-light p-4 text-sm leading-6 text-danger" role="alert">{error}</p>}
      <div className="space-y-5">
        <Select label="Profile" options={accounts.map((account) => ({ value: account.id, label: `${account.full_name} - ${account.role}` }))} value={selectedAccountId} onChange={selectAccount} placeholder={loadingAccounts ? 'Loading profiles...' : 'Select a profile'} disabled={loadingAccounts || signingIn} />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="student1@nest.edu"
          disabled={loadingAccounts || signingIn}
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter password"
          disabled={loadingAccounts || signingIn}
        />
        <p className="rounded-xl bg-primary/10 p-4 text-sm leading-6 text-text-secondary">
          {autoSigningIn ? 'Connecting to the seeded Supabase account...' : 'Development mode signs you in automatically with a real Supabase Auth account. You can also choose another backend account below.'}
        </p>
        <Button type="submit" size="lg" className="w-full" loading={signingIn || autoSigningIn} disabled={loadingAccounts || autoSigningIn || !selectedAccountId}>
          <LogIn className="h-4 w-4" />
          Open workspace
        </Button>
      </div>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
        Local demo mode is active while network access is limited. The real Supabase path remains ready for reconnecting.
      </div>

      <Suspense fallback={<div className="text-sm text-text-secondary">Loading...</div>}>
        <LoginForm />
      </Suspense>

      <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-text-muted">Quick access</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/student/dashboard" className="rounded-xl bg-primary px-5 py-4 text-center font-semibold text-white transition hover:bg-primary-hover">Open student portal</Link>
          <Link href="/coordinator/dashboard" className="rounded-xl border border-border bg-surface px-5 py-4 text-center font-semibold text-text-primary transition hover:bg-surface-hover">Open coordinator portal</Link>
        </div>
      </div>
    </div>
  )
}