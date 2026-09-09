import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  try {
    const supabase = await createAdminClient()
    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entity_type')
    const entityId = searchParams.get('entity_id')

    let query = supabase.from('google_sheets_sync').select('*').order('created_at', { ascending: false })

    if (entityType && entityId) {
      query = query.eq('entity_type', entityType).eq('entity_id', entityId).limit(1)
    } else {
      query = query.limit(50)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}