import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized user session.' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const targetUserId = user.id

    // 1. Delete user child dependencies in public schema
    await adminClient.from('student_course_units').delete().eq('user_id', targetUserId)
    await adminClient.from('group_members').delete().eq('user_id', targetUserId)
    await adminClient.from('group_join_requests').delete().eq('user_id', targetUserId)
    await adminClient.from('selected_coordinators').delete().eq('user_id', targetUserId)
    await adminClient.from('tasks').delete().eq('user_id', targetUserId)
    await adminClient.from('users').delete().eq('id', targetUserId)

    // 2. Delete user from Supabase Auth admin service (auth.users)
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(targetUserId)
    if (deleteAuthError) {
      console.warn('Auth admin delete User warning:', deleteAuthError.message)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete account API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete account' },
      { status: 500 }
    )
  }
}
