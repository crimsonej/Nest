import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/admin/lecturers/reset-password
// Resets a lecturer's password in Supabase Auth to a default/chosen password.
export async function PATCH(request: Request) {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    // Verify requesting user is admin
    const { data: profile } = await authClient
      .from('users')
      .select('role, status')
      .eq('id', user.id)
      .maybeSingle()

    const isAdmin = profile?.role === 'admin' || (profile as any)?.status === 'admin'
    if (!isAdmin) {
      return NextResponse.json({ error: 'Administrator permissions required' }, { status: 403 })
    }

    const body = await request.json()
    const { lecturer_id, password } = body

    if (!lecturer_id) {
      return NextResponse.json({ error: 'Lecturer ID is required' }, { status: 400 })
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters long' }, { status: 400 })
    }

    const cleanPassword = password.trim()
    const adminSupabase = createAdminClient()

    // 1. Update password in Supabase Auth via Admin API
    const { error: authErr } = await adminSupabase.auth.admin.updateUserById(lecturer_id, {
      password: cleanPassword,
      app_metadata: { role: 'lecturer', provider: 'email', providers: ['email'], must_change_password: true },
    })

    if (authErr) {
      console.error('Error updating password in Supabase Auth:', authErr)
      return NextResponse.json({ error: authErr.message }, { status: 400 })
    }

    // 2. Update temp_password and set must_change_password flag to true in public.lecturers
    const { error: lectErr } = await adminSupabase
      .from('lecturers')
      .update({
        temp_password: cleanPassword,
        must_change_password: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lecturer_id)

    if (lectErr) {
      console.warn('Warning: Could not update lecturers table record:', lectErr)
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully. The lecturer will use this default password for their next login.',
    })
  } catch (error: any) {
    console.error('PATCH /api/admin/lecturers/reset-password error:', error)
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}
