import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getLocalUserByEmail, isLocalDataMode } from '@/lib/local-data'

export const dynamic = 'force-dynamic'

const seededAccounts = {
  student: {
    email: 'student1@nest.edu',
    password: 'NestStudent123!',
  },
  coordinator: {
    email: 'coordinator@nest.edu',
    password: 'NestCoordinator123!',
  },
} as const

function getAccount(role: keyof typeof seededAccounts) {
  const fallback = seededAccounts[role]
  return {
    email: role === 'coordinator' ? process.env.NEST_AUTO_LOGIN_COORDINATOR_EMAIL || fallback.email : process.env.NEST_AUTO_LOGIN_EMAIL || fallback.email,
    password: role === 'coordinator' ? process.env.NEST_AUTO_LOGIN_COORDINATOR_PASSWORD || fallback.password : process.env.NEST_AUTO_LOGIN_PASSWORD || fallback.password,
  }
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Automatic login is available only in development.' }, { status: 404 })
  }

  if (isLocalDataMode()) {
    const body = await request.json().catch(() => ({})) as { role?: keyof typeof seededAccounts }
    const role = body.role === 'coordinator' ? 'coordinator' : 'student'
    const account = getAccount(role)
    const user = getLocalUserByEmail(account.email)

    if (!user || user.role !== role) {
      return NextResponse.json({ error: 'Local demo account unavailable for this role.' }, { status: 401 })
    }

    return NextResponse.json({
      authenticated: true,
      email: user.email,
      role: user.role,
    })
  }

  try {
    const body = await request.json().catch(() => ({})) as { role?: keyof typeof seededAccounts }
    const role = body.role === 'coordinator' ? 'coordinator' : 'student'
    const account = getAccount(role)
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