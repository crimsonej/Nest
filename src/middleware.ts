import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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
  const isAdminPage = request.nextUrl.pathname.startsWith('/admin')
  const isApiRoute = request.nextUrl.pathname.startsWith('/api')

  // Allow API routes and auth pages always
  if (isApiRoute || isAuthPage) {
    return supabaseResponse
  }

  // Require a live Supabase session for app access.
  const hasSession = !!user

  if (hasSession) {
    let userRole = user.user_metadata?.role
    let userStatus = user.user_metadata?.status

    try {
      const { data: profile } = await supabase
        .from('users')
        .select('role, status')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.role) userRole = profile.role
      if ((profile as any)?.status) userStatus = (profile as any).status
    } catch (err) {
      // Ignore DB read errors and rely on the authenticated session metadata.
    }

    const isCoordinatorRole =
      userRole === 'coordinator' ||
      userRole === 'lecturer' ||
      userRole === 'admin' ||
      userStatus === 'coordinator' ||
      userStatus === 'selected_coordinator' ||
      userStatus === 'admin'

    const isStudentRole = (userRole === 'student' || !userRole) && !isCoordinatorRole
    const isAdminRole = userRole === 'admin' || userStatus === 'admin'

    if (isAdminPage && !isAdminRole) {
      const url = request.nextUrl.clone()
      url.pathname = isCoordinatorRole ? '/coordinator/dashboard' : '/student/dashboard'
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
  if (isStudentPage || isCoordinatorPage || isAdminPage) {
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