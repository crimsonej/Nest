import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
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

    // Clear must_change_password and temp_password in public.lecturers and auth metadata in parallel
    const updateDbPromise = admin
      .from('lecturers')
      .update({
        must_change_password: false,
        temp_password: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    const updateAuthPromise = admin.auth.admin.updateUserById(user.id, {
      app_metadata: { must_change_password: false },
      user_metadata: { must_change_password: false },
    })

    const [dbResult, authResult] = await Promise.allSettled([updateDbPromise, updateAuthPromise])

    if (dbResult.status === 'rejected' && authResult.status === 'rejected') {
      console.error('Failed both DB and Auth updates in clear-must-change-password:', dbResult.reason, authResult.reason)
      return NextResponse.json({ error: 'Failed to update password flag.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('POST /api/lecturer/clear-must-change-password error:', err)
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}
