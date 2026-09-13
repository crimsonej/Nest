import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getLocalState, isLocalDataMode } from '@/lib/local-data'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Preview profiles are available only in development.' }, { status: 404 })
  }

  if (isLocalDataMode()) {
    const { users } = getLocalState()
    return NextResponse.json({
      accounts: users.map((user) => ({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        status: user.status,
        created_at: user.created_at,
        updated_at: user.updated_at,
      })),
    })
  }

  try {
    const supabase = await createAdminClient()
    const { data: accounts, error } = await supabase
      .from('users')
      .select('*')
      .order('role')
      .order('full_name')

    if (error) throw error
    return NextResponse.json({ accounts: accounts || [] })
  } catch (error) {
    console.error('Preview profile list failed:', error)
    return NextResponse.json({ error: 'Unable to load preview profiles.' }, { status: 500 })
  }
}