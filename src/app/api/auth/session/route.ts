import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionToken } = await request.json()

    // Check if user is normal student
    const { data: profile } = await supabase
      .from('users')
      .select('role, status')
      .eq('id', user.id)
      .maybeSingle()

    const isNormalStudent = profile?.role === 'student' && (!profile?.status || profile?.status === 'normal')

    if (isNormalStudent && sessionToken) {
      // Deactivate older active sessions for this normal student
      await supabase
        .from('active_sessions')
        .delete()
        .eq('user_id', user.id)
        .neq('session_token', sessionToken)

      // Upsert current session token
      await supabase
        .from('active_sessions')
        .upsert({
          user_id: user.id,
          session_token: sessionToken,
          last_active_at: new Date().toISOString(),
        }, { onConflict: 'session_token' })
    }

    return NextResponse.json({ success: true, isNormalStudent })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
