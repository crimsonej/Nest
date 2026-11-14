'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SemesterEvent } from '@/types'

/** Calendar events for one semester, in date order. */
export function useSemesterEvents(semesterId: string | null | undefined) {
  const supabase = useMemo(() => createClient(), [])
  const [events, setEvents] = useState<SemesterEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!semesterId) {
      setEvents([])
      return
    }
    setLoading(true)
    const { data, error: loadError } = await supabase
      .from('semester_events')
      .select('id, semester_id, title, kind, starts_on, ends_on, description, created_at')
      .eq('semester_id', semesterId)
      .order('starts_on')
      .order('ends_on', { nullsFirst: true })
    setError(loadError?.message || null)
    setEvents((data as SemesterEvent[]) || [])
    setLoading(false)
  }, [semesterId, supabase])

  useEffect(() => {
    void reload()
  }, [reload])

  return { events, loading, error, reload }
}
