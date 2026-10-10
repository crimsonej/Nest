import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  // Accumulate cookies to apply to the final redirect response
  const cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }> = []

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookiesToSet.push({ name, value, options })
          },
          remove(name: string, options: CookieOptions) {
            cookiesToSet.push({ name, value: '', options })
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data?.session) {
      // Determine the correct redirect destination
      let redirectPath: string

      if (next) {
        redirectPath = next
      } else {
        // Check if this is a password recovery flow
        // Recovery sessions have the aal1 level and the session was just created
        const isRecovery = next === '/auth/update-password' ||
          data.session.user?.recovery_sent_at != null

        if (isRecovery) {
          redirectPath = '/auth/update-password'
        } else {
          // Check user role for proper dashboard redirection
          const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', data.session.user.id)
            .maybeSingle()

          const userRole = profile?.role ||
            data.session.user.app_metadata?.role ||
            data.session.user.user_metadata?.role

          if (userRole === 'admin') {
            redirectPath = '/admin/dashboard'
          } else if (userRole === 'lecturer') {
            redirectPath = '/lecturer/reports'
          } else if (userRole === 'coordinator') {
            redirectPath = '/coordinator/dashboard'
          } else {
            redirectPath = '/student/dashboard'
          }
        }
      }

      const response = NextResponse.redirect(`${origin}${redirectPath}`)

      // Apply all accumulated cookies to the response
      for (const cookie of cookiesToSet) {
        response.cookies.set(cookie.name, cookie.value, cookie.options)
      }

      return response
    }
  }

  const errorResponse = NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`)

  // Even on error, apply cookies so Supabase client state stays consistent
  for (const cookie of cookiesToSet) {
    errorResponse.cookies.set(cookie.name, cookie.value, cookie.options)
  }

  return errorResponse
}