'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ShieldCheck } from 'lucide-react'
import Image from 'next/image'

const MIN_LENGTH = 8

function passwordStrength(pwd: string): { score: number; label: string; color: string } {
  let score = 0
  if (pwd.length >= MIN_LENGTH) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++

  if (score <= 1) return { score, label: 'Weak', color: '#ef4444' }
  if (score === 2) return { score, label: 'Fair', color: '#f97316' }
  if (score === 3) return { score, label: 'Good', color: '#eab308' }
  return { score, label: 'Strong', color: '#22c55e' }
}

export function LecturerChangePassword() {
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
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center p-10"
        >
          <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="h-10 w-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Password Updated!</h2>
          <p className="text-slate-400">Redirecting to your portal…</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] px-4">
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        {/* Logo + Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-5">
            <Image src="/logo.png" alt="NEST" width={44} height={44} className="rounded-2xl" />
            <div className="text-left">
              <p className="text-white font-extrabold tracking-[0.18em] text-base">NEST</p>
              <p className="text-violet-400 text-[10px] font-bold uppercase tracking-[0.14em]">Lecturer Portal</p>
            </div>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="h-7 w-7 text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Set Your Password</h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
            You're using a temporary password. Please create a new secure password before continuing.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-7 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* New password */}
            <div>
              <label htmlFor="new-password" className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="new-password"
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                  tabIndex={-1}
                  aria-label={showNew ? 'Hide password' : 'Show password'}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Strength meter */}
              {newPassword.length > 0 && (
                <div className="mt-2.5 space-y-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-1 flex-1 rounded-full transition-all duration-300"
                        style={{
                          backgroundColor: i <= strength.score ? strength.color : 'rgba(255,255,255,0.1)',
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-xs" style={{ color: strength.color }}>
                    {strength.label} password
                  </p>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label htmlFor="confirm-password" className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your new password"
                  className={`w-full rounded-xl bg-white/5 border text-white placeholder-slate-500 pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 transition ${
                    mismatch
                      ? 'border-red-500/50 focus:ring-red-500/30'
                      : 'border-white/10 focus:ring-violet-500/50 focus:border-violet-500/50'
                  }`}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                  tabIndex={-1}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {mismatch && (
                <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Passwords don't match
                </p>
              )}
            </div>

            {/* Rules */}
            <ul className="text-xs text-slate-400 space-y-1 pl-1">
              {[
                { rule: 'At least 8 characters', ok: newPassword.length >= MIN_LENGTH },
                { rule: 'At least one uppercase letter', ok: /[A-Z]/.test(newPassword) },
                { rule: 'At least one number', ok: /[0-9]/.test(newPassword) },
                { rule: 'Passwords match', ok: confirmPassword.length > 0 && newPassword === confirmPassword },
              ].map(({ rule, ok }) => (
                <li key={rule} className="flex items-center gap-2">
                  <div className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-green-400' : 'bg-white/20'}`} />
                  <span className={ok ? 'text-green-400' : ''}>{rule}</span>
                </li>
              ))}
            </ul>

            {/* Error */}
            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={!canSubmit}
              whileHover={canSubmit ? { scale: 1.02 } : {}}
              whileTap={canSubmit ? { scale: 0.98 } : {}}
              className="w-full py-3.5 rounded-xl font-semibold text-sm text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-violet-600/20"
            >
              {loading ? 'Updating…' : 'Set New Password'}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
