import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET() {
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
    console.error('Profile list failed:', error)
    return NextResponse.json({ error: 'Unable to load user accounts from Supabase.' }, { status: 500 })
  }
}