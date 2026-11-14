'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { useReducedMotion, applyMotionPreference } from '@/lib/animation'
import { createClient } from '@/lib/supabase/client'
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ShieldCheck } from 'lucide-react'
import Image from 'next/image'

const MIN_LENGTH = 8

// Strength colours come from the design tokens so they follow the active theme and palette.
function passwordStrength(pwd: string): { score: number; label: string; color: string } {
  let score = 0
  if (pwd.length >= MIN_LENGTH) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++

  if (score <= 1) return { score, label: 'Weak', color: 'var(--color-danger)' }
  if (score === 2) return { score, label: 'Fair', color: 'var(--color-warning)' }
  if (score === 3) return { score, label: 'Good', color: 'var(--color-primary)' }
  return { score, label: 'Strong', color: 'var(--color-success)' }
}

export function LecturerChangePassword() {
  const reducedMotion = useReducedMotion()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const strength = passwordStrength(newPassword)
  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword
  const canSubmit = newPassword.length >= MIN_LENGTH && newPassword === confirmPassword && !loading

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()

      // Update password via Supabase Auth (client-side — signed-in user only)
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) throw updateError

      // Clear must_change_password flag via trusted server API
      const res = await fetch('/api/lecturer/clear-must-change-password', { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || 'Failed to clear password flag.')
      }

      setSuccess(true)
      // Redirect to the portal after a short delay
      setTimeout(() => {
        window.location.href = '/lecturer/reports'
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <motion.div
          initial={applyMotionPreference(reducedMotion, { scale: 0.85, opacity: 0 }, {})}
          animate={applyMotionPreference(reducedMotion, { scale: 1, opacity: 1 }, {})}
          className="text-center p-10"
          role="status"
        >
          <div className="w-20 h-20 rounded-full bg-success-light border border-success/30 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="h-10 w-10 text-success" aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Password Updated!</h2>
          <p className="text-text-secondary">Redirecting to your portal…</p>
        </motion.div>
      </div>
    )
  }

  const inputClasses =
    'w-full rounded-xl border bg-surface text-text-primary placeholder:text-text-muted pl-10 pr-11 py-3 text-sm transition focus:outline-none focus:ring-4'

  const rules = [
    { rule: 'At least 8 characters', ok: newPassword.length >= MIN_LENGTH },
    { rule: 'At least one uppercase letter', ok: /[A-Z]/.test(newPassword) },
    { rule: 'At least one number', ok: /[0-9]/.test(newPassword) },
    { rule: 'Passwords match', ok: confirmPassword.length > 0 && newPassword === confirmPassword },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <motion.div
        initial={applyMotionPreference(reducedMotion, { y: 24, opacity: 0 }, {})}
        animate={applyMotionPreference(reducedMotion, { y: 0, opacity: 1 }, {})}
        transition={applyMotionPreference(reducedMotion, { duration: 0.45, ease: 'easeOut' }, {})}
        className="w-full max-w-md"
      >
        {/* Logo + Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-5">
            <Image src="/logo.png" alt="NEST" width={44} height={44} className="rounded-2xl" />
            <div className="text-left">
              <p className="text-text-primary font-extrabold tracking-[0.18em] text-base">NEST</p>
              <p className="text-primary text-[10px] font-bold uppercase tracking-[0.14em]">Lecturer Portal</p>
            </div>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-primary-light border border-primary/30 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">Set Your Password</h1>
          <p className="text-text-secondary text-sm leading-relaxed max-w-xs mx-auto">
            You're using a temporary password. Please create a new secure password before continuing.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-surface/90 backdrop-blur-sm p-7 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>

            {/* New password */}
            <div>
              <label htmlFor="new-password" className="block text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wider">
                New Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" aria-hidden="true" />
                <input
                  id="new-password"
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className={cn(inputClasses, 'border-border focus:border-primary focus:ring-primary/15')}
                  required
                  autoComplete="new-password"
                  aria-describedby="password-strength password-rules"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(v => !v)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-text-muted transition hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label={showNew ? 'Hide new password' : 'Show new password'}
                  aria-pressed={showNew}
                >
                  {showNew ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>

              {/* Strength meter */}
              <div id="password-strength" aria-live="polite">
                {newPassword.length > 0 && (
                  <div className="mt-2.5 space-y-1.5">
                    <div className="flex gap-1" aria-hidden="true">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="h-1 flex-1 rounded-full bg-border transition-all duration-300"
                          style={i <= strength.score ? { backgroundColor: strength.color } : undefined}
                        />
                      ))}
                    </div>
                    <p className="text-xs font-semibold" style={{ color: strength.color }}>
                      {strength.label} password
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label htmlFor="confirm-password" className="block text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wider">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" aria-hidden="true" />
                <input
                  id="confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your new password"
                  className={cn(
                    inputClasses,
                    mismatch ? 'border-danger focus:border-danger focus:ring-danger/20' : 'border-border focus:border-primary focus:ring-primary/15'
                  )}
                  required
                  autoComplete="new-password"
                  aria-invalid={mismatch}
                  aria-describedby={mismatch ? 'confirm-password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-text-muted transition hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label={showConfirm ? 'Hide confirmation password' : 'Show confirmation password'}
                  aria-pressed={showConfirm}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
              {mismatch && (
                <p id="confirm-password-error" className="mt-1.5 text-xs text-danger flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" aria-hidden="true" /> Passwords don't match
                </p>
              )}
            </div>

            {/* Rules */}
            <ul id="password-rules" className="text-xs text-text-muted space-y-1 pl-1">
              {rules.map(({ rule, ok }) => (
                <li key={rule} className="flex items-center gap-2">
                  <span className={cn('h-1.5 w-1.5 rounded-full', ok ? 'bg-success' : 'bg-border')} aria-hidden="true" />
                  <span className={ok ? 'text-success' : ''}>
                    {rule}
                    <span className="sr-only">{ok ? ' (met)' : ' (not met)'}</span>
                  </span>
                </li>
              ))}
            </ul>

            {/* Error */}
            {error && (
              <div role="alert" className="rounded-xl bg-danger-light border border-danger/30 px-4 py-3 text-sm text-danger flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
                {error}
              </div>
            )}

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={!canSubmit}
              whileHover={canSubmit ? applyMotionPreference(reducedMotion, { scale: 1.02 }, {}) : undefined}
              whileTap={canSubmit ? applyMotionPreference(reducedMotion, { scale: 0.98 }, {}) : undefined}
              className="w-full py-3.5 rounded-xl font-semibold text-sm text-white bg-primary hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-[var(--color-primary)]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {loading ? 'Updating…' : 'Set New Password'}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
