import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const defaultPasswords = {
  student: 'NestStudent123!',
  coordinator: 'NestCoordinator123!',
} as const

async function getAccount(role: 'student' | 'coordinator') {
  const supabase = await createClient()
  const { data: profile, error } = await supabase
    .from('users')
    .select('email')
    .eq('role', role)
    .order('full_name', { ascending: true })
    .limit(1)
    .maybeSingle()

  const dbEmail = profile?.email || (role === 'coordinator' ? process.env.NEST_AUTO_LOGIN_COORDINATOR_EMAIL : process.env.NEST_AUTO_LOGIN_EMAIL)
  const fallbackEmail = dbEmail || (role === 'coordinator' ? 'coordinator@nest.edu' : 'student 1@nest.edu')
  const password = (role === 'coordinator' ? process.env.NEST_AUTO_LOGIN_COORDINATOR_PASSWORD : process.env.NEST_AUTO_LOGIN_PASSWORD) || defaultPasswords[role]

  if (error && !dbEmail) {
    throw error
  }

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
      .eq('id', data.user.id)
      .single()

    if (profileError) throw profileError

    return NextResponse.json({
      authenticated: true,
      email: data.user.email,
      role: profile.role,
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