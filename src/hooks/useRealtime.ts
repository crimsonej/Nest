'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UseRealtimeOptions<T> {
  table: string
  filter?: string
  onInsert?: (payload: T) => void
  onUpdate?: (payload: T) => void
  onDelete?: (payload: T) => void
  enabled?: boolean
}

export function useRealtime<T = Record<string, unknown>>({
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete,
  enabled = true,
}: UseRealtimeOptions<T>) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!enabled) return

    const newChannel = supabase
      .channel(`realtime:${table}`) as any

    newChannel
      .on(
        'postgres_changes' as const,
        {
          event: '*',
          schema: 'public',
          table,
          filter,
        },
        (payload: { eventType: string; new?: T; old?: T }) => {
          switch (payload.eventType) {
            case 'INSERT':
              onInsert?.(payload.new as T)
              break
            case 'UPDATE':
              onUpdate?.(payload.new as T)
              break
            case 'DELETE':
              onDelete?.(payload.old as T)
              break
          }
        }
      )
      .subscribe()

    setChannel(newChannel)

    return () => {
      supabase.removeChannel(newChannel)
    }
  }, [table, filter, onInsert, onUpdate, onDelete, enabled])

  return channel
}

export function useRealtimeSubscription(
  channelName: string,
  callback: (payload: unknown) => void,
  deps: unknown[] = []
) {
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(channelName) as any

    channel
      .on(
        'postgres_changes' as const,
        { event: '*', schema: 'public' },
        callback
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, deps)
}

export function useLiveQuery<T extends { id: string }>(
  queryFn: () => Promise<T[]>,
  deps: unknown[] = [],
  realtimeTable?: string,
  realtimeFilter?: string
) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const result = await queryFn()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [queryFn])

  useEffect(() => {
    fetchData()
  }, [fetchData, ...deps])

  useRealtime<T>({
    table: realtimeTable || '',
    filter: realtimeFilter,
    onInsert: (newRow) => setData((prev) => [...prev, newRow]),
    onUpdate: (updatedRow) =>
      setData((prev) => prev.map((row) => (row.id === updatedRow.id ? updatedRow : row))),
    onDelete: (deletedRow) =>
      setData((prev) => prev.filter((row) => row.id !== deletedRow.id)),
    enabled: !!realtimeTable,
  })

  return { data, loading, error, refetch: fetchData }
}