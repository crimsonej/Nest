'use client'

import { useEffect, useState } from 'react'

type Health = { connected: boolean; universities?: number; error?: string }

export default function DatabaseStatus() {
  const [health, setHealth] = useState<Health | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then(async (response) => setHealth(await response.json()))
      .catch(() => setHealth({ connected: false, error: 'Unable to check database connection.' }))
  }, [])

  if (!health) return <p className="mt-3 text-xs text-text-muted">Checking database connection...</p>

  return (
    <p className={`mt-3 text-xs ${health.connected ? 'text-success' : 'text-danger'}`} role="status">
      {health.connected ? `Supabase connected · ${health.universities || 0} universities available` : `Supabase unavailable · ${health.error}`}
    </p>
  )
}