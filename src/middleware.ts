import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isLocalDataMode } from '@/lib/local-data'

export async function middleware(request: NextRequest) {
  if (isLocalDataMode()) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          supabaseResponse = NextResponse.next({
            request,
          })
          supabaseResponse.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          supabaseResponse = NextResponse.next({
            request,
          })
          supabaseResponse.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isAuthPage = request.nextUrl.pathname.startsWith('/auth')
  const isStudentPage = request.nextUrl.pathname.startsWith('/student')
  const isCoordinatorPage = request.nextUrl.pathname.startsWith('/coordinator')
  const isApiRoute = request.nextUrl.pathname.startsWith('/api')

  // Allow API routes and auth pages always
  if (isApiRoute || isAuthPage) {
    return supabaseResponse
  }

  // Check for preview mode cookies (set by login page when Supabase Auth is not yet seeded)
  const previewUserId = request.cookies.get('nest-preview-user-id')?.value
  const previewRole = request.cookies.get('nest-preview-role')?.value
  const previewStatus = request.cookies.get('nest-preview-status')?.value

  // If we have a valid Supabase Auth session OR a preview cookie, allow access
  const hasSession = !!user
  const hasPreviewSession = !!previewUserId && !!previewRole

  if (hasSession || hasPreviewSession) {
    // Determine effective role & status using DB profile, auth user metadata, or preview cookies
    let userRole = previewRole
    let userStatus = previewStatus

    if (user) {
      userRole = user.user_metadata?.role || previewRole
      userStatus = user.user_metadata?.status || previewStatus

      // Try fetching exact DB role if available
      try {
        const { data: profile } = await supabase
          .from('users')
          .select('role, status')
          .eq('id', user.id)
          .maybeSingle()

        if (profile?.role) userRole = profile.role
        if ((profile as any)?.status) userStatus = (profile as any).status
      } catch (err) {
        // Ignore DB read errors in middleware and rely on auth metadata/cookie fallback
      }
    }

    const isCoordinatorRole =
      userRole === 'coordinator' ||
      userRole === 'lecturer' ||
      userStatus === 'coordinator' ||
      userStatus === 'selected_coordinator'

    const isStudentRole = (userRole === 'student' || !userRole) && !isCoordinatorRole

    if (isStudentPage && !isStudentRole && isCoordinatorRole) {
      const url = request.nextUrl.clone()
      url.pathname = '/coordinator/dashboard'
      return NextResponse.redirect(url)
    }

    if (isCoordinatorPage && !isCoordinatorRole && isStudentRole) {
      const url = request.nextUrl.clone()
      url.pathname = '/student/dashboard'
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  }

  // No session at all — redirect to login
  if (isStudentPage || isCoordinatorPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}