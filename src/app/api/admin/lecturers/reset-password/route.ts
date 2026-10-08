import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

// PATCH /api/admin/lecturers/reset-password
// Resets a lecturer's password in Supabase Auth to a default/chosen password.
export async function PATCH(request: Request) {
  try {
    const adminSupabase = createAdminClient()
    const authClient = await createClient()
    
    let { data: { user } } = await authClient.auth.getUser()

    // Fallback: If no cookie user, try bearer token header if present
    if (!user) {
      const authHeader = request.headers.get('Authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1]
        const { data } = await adminSupabase.auth.getUser(token)
        user = data.user
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify requesting user is admin using service role to bypass RLS restrictions
    const { data: profile } = await adminSupabase
      .from('users')
      .select('role, status')
      .eq('id', user.id)
      .maybeSingle()

    const isAdmin =
      profile?.role === 'admin' ||
      (profile as any)?.status === 'admin' ||
      user.user_metadata?.role === 'admin' ||
      user.app_metadata?.role === 'admin'

    if (!isAdmin) {
      return NextResponse.json({ error: 'Administrator permissions required' }, { status: 403 })
    }

    const body = await request.json()
    const { lecturer_id, password } = body

    if (!lecturer_id) {
      return NextResponse.json({ error: 'Lecturer ID is required' }, { status: 400 })
    }
    if (!password || password.trim().length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters long' }, { status: 400 })
    }

    const cleanPassword = password.trim()

    // 1. Fetch lecturer details from lecturers or users table
    const { data: lectRecord } = await adminSupabase
      .from('lecturers')
      .select('id, email, name')
      .eq('id', lecturer_id)
      .maybeSingle()

    const { data: userRecord } = await adminSupabase
      .from('users')
      .select('id, email, full_name')
      .eq('id', lecturer_id)
      .maybeSingle()

    const targetEmail = lectRecord?.email || userRecord?.email

    // 2. Update password in Supabase Auth via Admin API
    let authErr: any = null
    const updateRes = await adminSupabase.auth.admin.updateUserById(lecturer_id, {
      password: cleanPassword,
      app_metadata: { role: 'lecturer', provider: 'email', providers: ['email'], must_change_password: true },
      user_metadata: { must_change_password: true, role: 'lecturer' },
    })

    authErr = updateRes.error

    // If user was not found in Supabase Auth, attempt to create/re-create auth user
    if (authErr && (authErr.message?.toLowerCase().includes('not found') || authErr.status === 404)) {
      if (targetEmail) {
        const createRes = await adminSupabase.auth.admin.createUser({
          email: targetEmail,
          password: cleanPassword,
          email_confirm: true,
          user_metadata: { full_name: lectRecord?.name || userRecord?.full_name || 'Lecturer', role: 'lecturer', must_change_password: true },
          app_metadata: { role: 'lecturer', provider: 'email', providers: ['email'], must_change_password: true },
        })
        if (!createRes.error) {
          authErr = null
        }
      }
    }

    if (authErr) {
      console.error('Error updating password in Supabase Auth:', authErr)
      return NextResponse.json({ error: authErr.message }, { status: 400 })
    }

    // 3. Update temp_password and set must_change_password flag to true in public.lecturers
    await adminSupabase
      .from('lecturers')
      .upsert({
        id: lecturer_id,
        name: lectRecord?.name || userRecord?.full_name || 'Lecturer',
        email: targetEmail || '',
        temp_password: cleanPassword,
        must_change_password: true,
        updated_at: new Date().toISOString(),
      })

    // Also update public.users if present
    await adminSupabase
      .from('users')
      .update({
        role: 'lecturer',
        updated_at: new Date().toISOString(),
      })
      .eq('id', lecturer_id)

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully. The lecturer will use this default password for their next login.',
    })
  } catch (error: any) {
    console.error('PATCH /api/admin/lecturers/reset-password error:', error)
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}

