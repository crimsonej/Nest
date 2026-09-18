'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, CheckCircle, Eye, EyeOff, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'

export default function UpdatePasswordPage() {
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [updated, setUpdated] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setReady(Boolean(data.session))
        if (!data.session) setError('This reset link is invalid or has expired. Request a new one.')
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password.length < 8) {
      setError('Your new password must be at least 8 characters long.')
      return
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.')
      return
    }

    setLoading(true)
    setError('')
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) setError(updateError.message)
    else setUpdated(true)
    setLoading(false)
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-8 space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary-light/50 px-3 py-1 text-[11px] font-bold text-primary">
          <KeyRound className="h-3.5 w-3.5" />
          Secure password update
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">Choose a new password</h1>
        <p className="text-sm leading-relaxed text-text-secondary">Use a password you have not used for another account.</p>
      </div>

      {updated ? (
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-2xl border border-success/30 bg-success-light p-4 text-sm text-text-primary" role="status">
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-success" />
            <p>Your password has been updated successfully.</p>
          </div>
          <Link href="/auth/login" className="block text-center text-sm font-bold text-primary hover:underline">Continue to sign in</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-danger/30 bg-danger-light p-3.5 text-xs font-semibold text-danger" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="relative">
            <Input label="New password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} icon={<KeyRound className="h-4 w-4" />} autoComplete="new-password" required disabled={!ready} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-[38px] p-1 text-text-muted hover:text-text-primary" aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Input label="Confirm new password" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} icon={<KeyRound className="h-4 w-4" />} autoComplete="new-password" required disabled={!ready} />
          <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!ready}>Update password</Button>
        </form>
      )}
    </div>
  )
}