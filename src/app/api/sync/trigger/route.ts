import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'edge'

export async function POST(request: Request) {
  try {
    const supabase = await createAdminClient()
    const body = await request.json()
    const { entity_type, entity_id } = body

    if (!entity_type || !entity_id) {
      return NextResponse.json({ error: 'entity_type and entity_id are required' }, { status: 400 })
    }

    // Queue the sync
    const { error } = await supabase
      .from('google_sheets_sync')
      .upsert({
        entity_type,
        entity_id,
        sync_status: 'pending',
        error_message: null,
      }, {
        onConflict: 'entity_type,entity_id',
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (supabaseUrl && serviceRoleKey) {
      const functionUrl = `${supabaseUrl}/functions/v1/google-sheets-sync`
      try {
        await fetch(functionUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ entity_type, entity_id }),
        })
      } catch (fetchError) {
        console.warn('Supabase edge sync skipped because the function endpoint is unavailable:', fetchError)
      }
    }

    return NextResponse.json({ success: true, message: 'Sync queued' })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}