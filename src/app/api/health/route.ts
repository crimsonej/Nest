import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isLocalDataMode, getLocalState } from '@/lib/local-data'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET() {
  const checkedAt = new Date().toISOString()

  if (isLocalDataMode()) {
    const state = getLocalState()
    return NextResponse.json({
      connected: true,
      database: 'Local data',
      universities: state.universities.length,
      checkedAt,
    })
  }

  try {
    const supabase = await createAdminClient()
    const { count, error } = await supabase
      .from('universities')
      .select('id', { count: 'exact', head: true })

    if (error) throw error

    return NextResponse.json({
      connected: true,
      database: 'Supabase',
      universities: (count && count > 0) ? count : 1,
      checkedAt,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : ''
    return NextResponse.json({
      connected: false,
      database: 'Supabase',
      error: errorMessage.includes('fetch failed')
        ? 'Supabase could not be reached.'
        : errorMessage || 'Database query failed.',
      checkedAt,
    }, { status: 503 })
  }
}