'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { LogIn, Mail, Lock, Eye, EyeOff, AlertCircle, Sparkles, MoonStar, SunMedium } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { resolvedTheme, setTheme } = useTheme()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isRegisteredSuccess = searchParams.get('registered') === 'true'

  function cycleTheme() {
    const order = ['light', 'mid', 'dark'] as const
    const current = (resolvedTheme as (typeof order)[number]) || 'light'
    const index = order.indexOf(current)
    setTheme(order[(index + 1) % order.length])
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email || !password) {
      setError('Please enter both email and password.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (signInError) {
        throw signInError
      }

      const authUser = data.user
      if (!authUser) {
        throw new Error('Authentication succeeded but user session could not be established.')
      }

      // Query user profile to determine redirect workspace
      const { data: profile } = await supabase
        .from('users')
        .select('role, status')
        .eq('id', authUser.id)
        .single()

      const isCoord =
        profile?.role === 'coordinator' ||
        profile?.status === 'coordinator' ||
        profile?.status === 'selected_coordinator'

      const redirect = searchParams.get('redirect')
      const destination = redirect?.startsWith('/')
        ? redirect
        : isCoord
        ? '/coordinator/dashboard'
        : '/student/dashboard'

      window.location.href = destination
    } catch (err) {
      console.error('Login error:', err)
      setError(
        err instanceof Error
          ? err.message
          : 'Invalid email or password. Please check your credentials and try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-6">
      <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Welcome back</p>
          <h1 className="mt-1.5 text-3xl font-extrabold tracking-tight text-text-primary">Sign in to NEST</h1>
          <p className="mt-2 text-xs sm:text-sm text-text-secondary">
            Enter your credentials to access your student or coordinator workspace.
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.1, rotate: 15 }}
          whileTap={{ scale: 0.9 }}
          type="button"
          onClick={cycleTheme}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/80 bg-surface/80 text-text-secondary transition shadow-xs hover:text-text-primary"
          aria-label="Switch theme"
          title="Switch theme"
        >
          {resolvedTheme === 'dark' ? (
            <SunMedium className="h-4 w-4 text-amber-400" />
          ) : resolvedTheme === 'mid' ? (
            <Sparkles className="h-4 w-4 text-rose-500" />
          ) : (
            <MoonStar className="h-4 w-4 text-slate-700" />
          )}
        </motion.button>
      </div>

      {isRegisteredSuccess && (
        <div className="rounded-2xl border border-success/20 bg-success-light p-4 text-xs font-semibold text-success" role="status">
          Registration successful! Please sign in with your email and password.
        </div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2.5 rounded-2xl border border-danger/25 bg-danger-light p-4 text-xs font-semibold text-danger"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </motion.div>
      )}

      <div className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          placeholder="student@university.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={<Mail className="h-4 w-4" />}
          autoComplete="email"
          required
        />

        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock className="h-4 w-4" />}
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-[38px] text-text-muted hover:text-text-primary transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <Button type="submit" size="lg" className="w-full mt-2 shadow-lg" loading={loading}>
          <LogIn className="h-4 w-4 mr-2" />
          Sign In
        </Button>
      </div>

      <div className="pt-4 border-t border-border/60 text-center text-xs text-text-secondary">
        Don&apos;t have an account yet?{' '}
        <Link href="/auth/register" className="font-bold text-primary hover:underline">
          Create an Account
        </Link>
      </div>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<div className="text-xs text-text-muted">Loading sign in form...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}