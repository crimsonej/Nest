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
  const isLecturerPage = request.nextUrl.pathname.startsWith('/lecturer')
  const isApiRoute = request.nextUrl.pathname.startsWith('/api')

  // Allow API routes and auth pages always
  if (isApiRoute || isAuthPage) {
    return supabaseResponse
  }

  // Require a live Supabase session for app access.
  const hasSession = !!user

  if (hasSession) {
    let userRole = user.user_metadata?.role || user.app_metadata?.role
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

    if (userRole !== 'lecturer') {
      try {
        const { data: lecturerProfile } = await supabase
          .from('lecturers')
          .select('id')
          .eq('id', user.id)
          .maybeSingle()

        if (lecturerProfile) {
          userRole = 'lecturer'
        }
      } catch (err) {
        // Ignore DB read errors
      }
    }

    const isAdminRole = userRole === 'admin' || userStatus === 'admin'
    const isLecturerRole = userRole === 'lecturer'
    const isCoordinatorRole =
      !isLecturerRole &&
      (userRole === 'coordinator' ||
        userRole === 'admin' ||
        userStatus === 'coordinator' ||
        userStatus === 'selected_coordinator' ||
        userStatus === 'admin')

    // Admin-only pages
    if (isAdminPage && !isAdminRole) {
      const url = request.nextUrl.clone()
      url.pathname = isLecturerRole
        ? '/lecturer/reports'
        : isCoordinatorRole
          ? '/coordinator/dashboard'
          : '/student/dashboard'
      return NextResponse.redirect(url)
    }

    // Coordinator-only pages
    if (isCoordinatorPage && !isCoordinatorRole) {
      const url = request.nextUrl.clone()
      url.pathname = isAdminRole
        ? '/admin/dashboard'
        : isLecturerRole
          ? '/lecturer/reports'
          : '/student/dashboard'
      return NextResponse.redirect(url)
    }

    // Lecturer-only pages
    if (isLecturerPage && !isLecturerRole) {
      const url = request.nextUrl.clone()
      url.pathname = isAdminRole
        ? '/admin/dashboard'
        : isCoordinatorRole
          ? '/coordinator/dashboard'
          : '/student/dashboard'
      return NextResponse.redirect(url)
    }

    // For lecturers: enforce password change before accessing the portal
    const isChangePasswordPage = request.nextUrl.pathname === '/lecturer/change-password'
    if (isLecturerRole && isLecturerPage && !isChangePasswordPage) {
      try {
        const { data: lecturerProfile } = await supabase
          .from('lecturers')
          .select('must_change_password')
          .eq('id', user.id)
          .maybeSingle()

        if (lecturerProfile?.must_change_password === true) {
          const url = request.nextUrl.clone()
          url.pathname = '/lecturer/change-password'
          return NextResponse.redirect(url)
        }
      } catch {
        // If we can't check, allow through
      }
    }

    return supabaseResponse
  }

  // No session at all — redirect to login
  if (isStudentPage || isCoordinatorPage || isAdminPage || isLecturerPage) {
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