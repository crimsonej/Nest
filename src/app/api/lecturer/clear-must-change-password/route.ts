import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // Build a server Supabase client to verify the caller is authenticated
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          supabaseResponse = NextResponse.next({ request })
          supabaseResponse.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          supabaseResponse = NextResponse.next({ request })
          supabaseResponse.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Verify caller exists in public.lecturers or has lecturer role in public.users
  const { data: lecturerCheck } = await admin
    .from('lecturers')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!lecturerCheck) {
    const { data: userCheck } = await admin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (userCheck?.role !== 'lecturer') {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }
  }

  // Clear must_change_password and temp_password in public.lecturers
  const { error } = await admin
    .from('lecturers')
    .update({
      must_change_password: false,
      temp_password: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) {
    console.error('Failed to clear must_change_password in lecturers table:', error)
    return NextResponse.json({ error: 'Failed to update password flag.' }, { status: 500 })
  }

  // Also clear the flag from auth app_metadata and user_metadata
  await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { must_change_password: false },
    user_metadata: { must_change_password: false },
  })

  return NextResponse.json({ success: true })
}
