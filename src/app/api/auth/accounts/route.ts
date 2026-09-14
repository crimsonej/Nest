import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createAdminClient()
    const [{ data: profileRows, error: profileError }, { data: authUsers, error: authError }] = await Promise.all([
      supabase.from('users').select('*').order('role').order('full_name'),
      supabase.auth.admin.listUsers(),
    ])

    if (profileError) throw profileError
    if (authError) throw authError

    const authList = authUsers?.users ?? []
    const profileMap = new Map<string, any>()

    for (const profile of profileRows || []) {
      if (!profile.email) continue
      profileMap.set(profile.email.toLowerCase(), profile)
      profileMap.set(profile.id, profile)
    }

    const accounts = authList
      .filter((user) => user.email && user.email.endsWith('@nest.edu'))
      .map((user) => {
        const profile = profileMap.get(user.id) || profileMap.get((user.email || '').toLowerCase())

        return {
          id: user.id,
          email: user.email || '',
          full_name: profile?.full_name || user.user_metadata?.full_name || 'User Profile',
          role: (profile?.role as 'student' | 'coordinator' | 'lecturer') || (user.user_metadata?.role as 'student' | 'coordinator' | 'lecturer') || 'student',
          gender: profile?.gender || user.user_metadata?.gender || 'other',
          faculty: profile?.faculty || user.user_metadata?.faculty,
          course: profile?.course || user.user_metadata?.course,
          university: profile?.university || user.user_metadata?.university || 'Ndejje University',
          student_registration_number: profile?.student_registration_number || user.user_metadata?.student_registration_number,
          whatsapp_phone: profile?.whatsapp_phone || user.user_metadata?.whatsapp_phone,
          status: profile?.status || user.user_metadata?.status || 'normal',
          selected_coordinator: Boolean(profile?.selected_coordinator ?? user.user_metadata?.selected_coordinator ?? false),
          created_at: profile?.created_at || new Date().toISOString(),
          updated_at: profile?.updated_at || new Date().toISOString(),
        }
      })
      .sort((a, b) => a.role.localeCompare(b.role) || a.full_name.localeCompare(b.full_name))

    return NextResponse.json({ accounts })
  } catch (error) {
    console.error('Profile list failed:', error)
    return NextResponse.json({ error: 'Unable to load user accounts from Supabase.' }, { status: 500 })
  }
}