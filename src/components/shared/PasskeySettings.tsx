'use client'

import { useCallback, useEffect, useState } from 'react'
import { Fingerprint, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { createClient } from '@/lib/supabase/client'

type Passkey = {
  id: string
  friendly_name?: string
  created_at: string
  last_used_at?: string
}

export function PasskeySettings() {
  const supabase = createClient()
  const [passkeys, setPasskeys] = useState<Passkey[]>([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadPasskeys = useCallback(async () => {
    const { data, error: listError } = await supabase.auth.passkey.list()
    if (listError) throw listError
    setPasskeys(data || [])
  }, [supabase])

  useEffect(() => {
    loadPasskeys()
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load passkeys.'))
      .finally(() => setLoading(false))
  }, [loadPasskeys])

  async function registerPasskey() {
    setWorking(true)
    setError('')
    setMessage('')
    try {
      const { data, error: registerError } = await supabase.auth.registerPasskey()
      if (registerError) throw registerError
      setMessage(`Passkey added${data?.friendly_name ? `: ${data.friendly_name}` : ''}.`)
      await loadPasskeys()
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : 'Unable to add a passkey.')
    } finally {
      setWorking(false)
    }
  }

  async function removePasskey(passkeyId: string) {
    if (!window.confirm('Remove this passkey? You will no longer be able to use it to sign in.')) return
    setWorking(true)
    setError('')
    setMessage('')
    try {
      const { error: deleteError } = await supabase.auth.passkey.delete({ passkeyId })
      if (deleteError) throw deleteError
      setPasskeys((current) => current.filter((passkey) => passkey.id !== passkeyId))
      setMessage('Passkey removed.')
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to remove this passkey.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <Card className="settings-card">
      <CardHeader>
        <CardTitle>Passkeys</CardTitle>
        <CardDescription>Use your device screen lock, biometrics, or a security key to sign in.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="rounded-xl border border-danger/30 bg-danger-light p-3 text-sm text-danger" role="alert">{error}</p>}
        {message && <p className="rounded-xl border border-success/30 bg-success/10 p-3 text-sm text-success" role="status">{message}</p>}
        {loading ? <p className="text-sm text-text-muted">Loading passkeys...</p> : passkeys.length > 0 ? (
          <ul className="divide-y divide-border">
            {passkeys.map((passkey) => (
              <li key={passkey.id} className="flex items-center justify-between gap-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Fingerprint className="h-5 w-5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-text-primary">{passkey.friendly_name || 'Passkey'}</p>
                    <p className="text-xs text-text-muted">Added {new Date(passkey.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" aria-label="Remove passkey" title="Remove passkey" disabled={working} onClick={() => removePasskey(passkey.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-text-muted">No passkeys registered yet.</p>}
        <Button onClick={registerPasskey} loading={working} disabled={loading}>
          <Fingerprint className="h-4 w-4" />
          Add a passkey
        </Button>
      </CardContent>
    </Card>
  )
}