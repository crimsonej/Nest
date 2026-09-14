import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const defaultPasswords = {
  student: 'NestStudent123!',
  coordinator: 'NestCoordinator123!',
} as const

async function getAccount(role: 'student' | 'coordinator') {
  const admin = await createAdminClient()
  const { data: authUsers, error: authError } = await admin.auth.admin.listUsers()

  const candidates = (authUsers?.users ?? []).filter((user) => {
    const metadataRole = user.user_metadata?.role
    return metadataRole === role || (metadataRole === undefined && user.email?.toLowerCase().includes(role))
  })

  const chosen = candidates.find((user) => user.email?.toLowerCase().endsWith('@nest.edu')) || candidates[0]

  if (!chosen && authError) {
    throw authError
  }

  const fallbackEmail = chosen?.email || (role === 'coordinator' ? 'coordinator@nest.edu' : 'student1@nest.edu')
  const password = (role === 'coordinator' ? process.env.NEST_AUTO_LOGIN_COORDINATOR_PASSWORD : process.env.NEST_AUTO_LOGIN_PASSWORD) || defaultPasswords[role]

  return {
    email: fallbackEmail,
    password,
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as { role?: 'student' | 'coordinator' }
    const role = body.role === 'coordinator' ? 'coordinator' : 'student'
    const account = await getAccount(role)
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword(account)

    if (error) throw error
    if (!data.user) throw new Error('Supabase returned no authenticated user.')

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .or(`id.eq.${data.user.id},email.eq.${data.user.email}`)
      .maybeSingle()

    if (profileError) throw profileError

    return NextResponse.json({
      authenticated: true,
      email: data.user.email,
      role: profile?.role || data.user.user_metadata?.role || role,
    })
  } catch (error) {
    const message = error instanceof Error && error.message === 'fetch failed'
      ? 'The Supabase project could not be reached. Check the project URL, network connection, and Supabase status.'
      : error instanceof Error ? error.message : 'Unable to authenticate with Supabase.'
    console.warn(`Automatic Supabase login unavailable: ${message}`)
    return NextResponse.json({
      error: message,
    }, { status: 401 })
  }
}