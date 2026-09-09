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
  const isApiRoute = request.nextUrl.pathname.startsWith('/api')

  // Allow API routes and auth pages
  if (isApiRoute || isAuthPage) {
    return supabaseResponse
  }

  // Redirect unauthenticated users to login
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Check user role for protected routes
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const userRole = profile?.role

  if (isStudentPage && userRole !== 'student') {
    const url = request.nextUrl.clone()
    url.pathname = userRole === 'coordinator' ? '/coordinator/dashboard' : '/auth/login'
    return NextResponse.redirect(url)
  }

  if (isCoordinatorPage && userRole !== 'coordinator' && userRole !== 'lecturer') {
    const url = request.nextUrl.clone()
    url.pathname = userRole === 'student' ? '/student/dashboard' : '/auth/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}