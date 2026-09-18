'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowLeft, CheckCircle, KeyRound, Mail } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/update-password`,
    })

    if (resetError) setError(resetError.message)
    else setSent(true)
    setLoading(false)
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-8 space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary-light/50 px-3 py-1 text-[11px] font-bold text-primary">
          <KeyRound className="h-3.5 w-3.5" />
          Account recovery
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">Reset your password</h1>
        <p className="text-sm leading-relaxed text-text-secondary">Enter the email address connected to your NEST account and we&apos;ll send you a secure reset link.</p>
      </div>

      {sent ? (
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-2xl border border-success/30 bg-success-light p-4 text-sm text-text-primary" role="status">
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-success" />
            <p>Check your inbox for the password reset link. It may take a moment to arrive.</p>
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={() => setSent(false)}>Send again</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-danger/30 bg-danger-light p-3.5 text-xs font-semibold text-danger" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <Input label="Email address" type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} icon={<Mail className="h-4 w-4" />} autoComplete="email" required />
          <Button type="submit" size="lg" className="w-full" loading={loading}>Send reset link</Button>
        </form>
      )}

      <Link href="/auth/login" className="mt-6 flex items-center justify-center gap-2 text-xs font-bold text-primary hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to sign in
      </Link>
    </div>
  )
}