import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

// GET /api/admin/lecturers
// Fetches all lecturers with linked faculties and course units,
// as well as active faculties and course units for dropdown selectors.
export async function GET() {
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

    const adminSupabase = createAdminClient()

    // 1. Fetch lecturers
    const { data: lecturers, error: lectErr } = await adminSupabase
      .from('lecturers')
      .select(`
        id,
        name,
        email,
        phone_number,
        faculty_id,
        course_unit_id,
        temp_password,
        must_change_password,
        created_at,
        faculties (
          id,
          name,
          code
        ),
        course_units (
          id,
          name,
          code
        )
      `)
      .order('created_at', { ascending: false })

    if (lectErr) {
      console.error('Error fetching lecturers:', lectErr)
      return NextResponse.json({ error: lectErr.message }, { status: 500 })
    }

    // 2. Fetch faculties list
    const { data: faculties } = await adminSupabase
      .from('faculties')
      .select('id, name, code, is_active')
      .eq('is_active', true)
      .order('name')

    // 3. Fetch course units list
    const { data: courseUnits } = await adminSupabase
      .from('course_units')
      .select('id, name, code, faculty_id, lecturer_id, is_active')
      .eq('is_active', true)
      .order('name')

    return NextResponse.json({
      lecturers: lecturers || [],
      faculties: faculties || [],
      courseUnits: courseUnits || [],
    })
  } catch (error: any) {
    console.error('GET /api/admin/lecturers error:', error)
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/lecturers
// Creates a new lecturer profile in Supabase Auth & public tables.
export async function POST(request: Request) {
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
    const { name, email, faculty_id, course_unit_id, password } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Lecturer name is required' }, { status: 400 })
    }
    if (!email || !email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 })
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()
    const cleanName = name.trim()
    const cleanPassword = password.trim()

    const adminSupabase = createAdminClient()

    // Step 1: Check if auth user exists, or create new auth user via Supabase Auth Admin API
    let userId: string | null = null

    // Search existing user by email
    const { data: existingAuthUsers } = await adminSupabase.auth.admin.listUsers()
    const existingUser = existingAuthUsers?.users?.find(u => u.email?.toLowerCase() === cleanEmail)

    if (existingUser) {
      userId = existingUser.id
      // Update password & metadata for existing auth user
      const { error: updateErr } = await adminSupabase.auth.admin.updateUserById(userId, {
        password: cleanPassword,
        email_confirm: true,
        user_metadata: { full_name: cleanName, role: 'lecturer' },
        app_metadata: { role: 'lecturer', provider: 'email', providers: ['email'], must_change_password: true },
      })
      if (updateErr) {
        console.error('Error updating existing auth user:', updateErr)
        return NextResponse.json({ error: updateErr.message }, { status: 400 })
      }
    } else {
      // Create new user in Supabase Auth
      const { data: createData, error: createErr } = await adminSupabase.auth.admin.createUser({
        email: cleanEmail,
        password: cleanPassword,
        email_confirm: true,
        user_metadata: { full_name: cleanName, role: 'lecturer' },
        app_metadata: { role: 'lecturer', provider: 'email', providers: ['email'], must_change_password: true },
      })

      if (createErr) {
        console.error('Error creating auth user:', createErr)
        return NextResponse.json({ error: createErr.message }, { status: 400 })
      }
      if (!createData.user) {
        return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 })
      }
      userId = createData.user.id
    }

    // Step 2: Ensure auth.identities record exists
    try {
      await adminSupabase.from('identities').insert({
        id: userId,
        user_id: userId,
        identity_data: { sub: userId, email: cleanEmail },
        provider: 'email',
        provider_id: cleanEmail,
        last_sign_in_at: new Date().toISOString(),
      })
    } catch {
      // Identity may already exist, ignore conflict
    }

    // Step 3: Upsert into public.users
    const { error: userTableErr } = await adminSupabase.from('users').upsert({
      id: userId,
      full_name: cleanName,
      email: cleanEmail,
      role: 'lecturer',
      faculty_id: faculty_id || null,
      status: 'normal',
      updated_at: new Date().toISOString(),
    })
    if (userTableErr) {
      console.error('Error upserting public.users:', userTableErr)
      return NextResponse.json({ error: userTableErr.message }, { status: 500 })
    }

    // Step 4: Upsert into public.lecturers
    const { data: lecturerRecord, error: lectErr } = await adminSupabase
      .from('lecturers')
      .upsert({
        id: userId,
        name: cleanName,
        email: cleanEmail,
        faculty_id: faculty_id || null,
        course_unit_id: course_unit_id || null,
        temp_password: cleanPassword,
        must_change_password: true,
        updated_at: new Date().toISOString(),
      })
      .select(`
        id,
        name,
        email,
        faculty_id,
        course_unit_id,
        temp_password,
        must_change_password,
        created_at,
        faculties ( id, name, code ),
        course_units ( id, name, code )
      `)
      .single()

    if (lectErr) {
      console.error('Error upserting public.lecturers:', lectErr)
      return NextResponse.json({ error: lectErr.message }, { status: 500 })
    }

    // Step 5: Update course_units.lecturer_id if course_unit_id is assigned
    if (course_unit_id) {
      // Clear previous assignment for this lecturer
      await adminSupabase
        .from('course_units')
        .update({ lecturer_id: null })
        .eq('lecturer_id', userId)

      // Assign new course unit
      await adminSupabase
        .from('course_units')
        .update({ lecturer_id: userId })
        .eq('id', course_unit_id)
    }

    return NextResponse.json({ success: true, lecturer: lecturerRecord })
  } catch (error: any) {
    console.error('POST /api/admin/lecturers error:', error)
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/lecturers?id=...
// Deletes a lecturer profile from public tables and Supabase Auth.
export async function DELETE(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const lecturerId = searchParams.get('id')
    if (!lecturerId) {
      return NextResponse.json({ error: 'Lecturer ID is required' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // 1. Unassign course unit
    await adminSupabase
      .from('course_units')
      .update({ lecturer_id: null })
      .eq('lecturer_id', lecturerId)

    // 2. Delete from public.lecturers
    await adminSupabase
      .from('lecturers')
      .delete()
      .eq('id', lecturerId)

    // 3. Delete from public.users
    await adminSupabase
      .from('users')
      .delete()
      .eq('id', lecturerId)

    // 4. Delete from Supabase Auth
    try {
      await adminSupabase.auth.admin.deleteUser(lecturerId)
    } catch (authErr) {
      console.warn('Warning: Could not delete user from auth.users:', authErr)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('DELETE /api/admin/lecturers error:', error)
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}
