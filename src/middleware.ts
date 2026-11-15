import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Routes each signed-in user to the workspace their role allows.
 *
 * Speed matters here because this runs before every page. The session is verified
 * locally with getClaims() (the project signs tokens with asymmetric keys, so no call
 * to the auth server is needed), and the user's role is cached for a few minutes in a
 * signed, httpOnly cookie so the database is not queried on every navigation.
 * Data access itself is always enforced by row-level security, not by this file.
 */

const ROLE_COOKIE = 'nest-role'
const ROLE_TTL_SECONDS = 300

type RoleInfo = { role: string; status: string }

const encoder = new TextEncoder()
let signingKey: Promise<CryptoKey> | null = null

function getSigningKey() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) return null
  signingKey ??= crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
  return signingKey
}

function toBase64Url(bytes: ArrayBuffer) {
  let binary = ''
  new Uint8Array(bytes).forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function sign(payload: string) {
  const key = getSigningKey()
  if (!key) return null
  return toBase64Url(await crypto.subtle.sign('HMAC', await key, encoder.encode(payload)))
}

async function readCachedRole(request: NextRequest, userId: string): Promise<RoleInfo | null> {
  const raw = request.cookies.get(ROLE_COOKIE)?.value
  if (!raw) return null
  const [payload, signature] = raw.split('.')
  if (!payload || !signature) return null
  const expected = await sign(payload)
  if (!expected || expected !== signature) return null
  try {
    const data = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as RoleInfo & { sub: string; exp: number }
    if (data.sub !== userId || data.exp < Date.now() / 1000) return null
    return { role: data.role, status: data.status }
  } catch {
    return null
  }
}

async function writeCachedRole(response: NextResponse, userId: string, info: RoleInfo) {
  const payload = btoa(JSON.stringify({ sub: userId, role: info.role, status: info.status, exp: Math.floor(Date.now() / 1000) + ROLE_TTL_SECONDS }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const signature = await sign(payload)
  if (!signature) return
  response.cookies.set(ROLE_COOKIE, `${payload}.${signature}`, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: ROLE_TTL_SECONDS,
  })
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isAuthPage = path.startsWith('/auth')
  const isStudentPage = path.startsWith('/student')
  const isCoordinatorPage = path.startsWith('/coordinator')
  const isAdminPage = path.startsWith('/admin')
  const isLecturerPage = path.startsWith('/lecturer')
  const isApiRoute = path.startsWith('/api')
  const isProtected = isStudentPage || isCoordinatorPage || isAdminPage || isLecturerPage

  let supabaseResponse = NextResponse.next({ request })

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
          supabaseResponse = NextResponse.next({ request })
          supabaseResponse.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          supabaseResponse = NextResponse.next({ request })
          supabaseResponse.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Verifies the session (refreshing it when needed) without a round trip to the auth server.
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims

  // API routes and auth pages do their own checks; they only need the session kept fresh.
  if (isApiRoute || isAuthPage || !isProtected) {
    return supabaseResponse
  }

  if (!claims?.sub) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirect', path)
    return NextResponse.redirect(url)
  }

  const userId = claims.sub
  const metadata = (claims.user_metadata || {}) as Record<string, unknown>
  const appMetadata = (claims.app_metadata || {}) as Record<string, unknown>

  let info = await readCachedRole(request, userId)
  type LecturerRow = { must_change_password: boolean | null; temp_password: string | null }
  let lecturerRow = null as LecturerRow | null
  const needsLecturerRow = isLecturerPage && path !== '/lecturer/change-password'

  if (!info || needsLecturerRow) {
    // One parallel round trip instead of several sequential ones.
    const [profileRes, lecturerRes] = await Promise.all([
      info ? Promise.resolve({ data: null }) : supabase.from('users').select('role, status').eq('id', userId).maybeSingle(),
      supabase.from('lecturers').select('must_change_password, temp_password').eq('id', userId).maybeSingle(),
    ])
    lecturerRow = (lecturerRes.data as LecturerRow | null) || null

    if (!info) {
      const profile = profileRes.data as { role?: string; status?: string } | null
      let role = profile?.role || (metadata.role as string) || (appMetadata.role as string) || 'student'
      if (lecturerRow) role = 'lecturer'
      info = { role, status: profile?.status || (metadata.status as string) || 'normal' }
      await writeCachedRole(supabaseResponse, userId, info)
    }
  }

  const { role: userRole, status: userStatus } = info
  const isAdminRole = userRole === 'admin' || userStatus === 'admin'
  const isLecturerRole = userRole === 'lecturer'
  const isCoordinatorRole =
    !isLecturerRole &&
    (userRole === 'coordinator' ||
      userRole === 'admin' ||
      userStatus === 'coordinator' ||
      userStatus === 'selected_coordinator' ||
      userStatus === 'admin')

  const redirectTo = (pathname: string) => {
    const url = request.nextUrl.clone()
    url.pathname = pathname
    const response = NextResponse.redirect(url)
    // Carry refreshed auth cookies (and the role cache) across the redirect.
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie))
    return response
  }

  if (isAdminPage && !isAdminRole) {
    return redirectTo(isLecturerRole ? '/lecturer/reports' : isCoordinatorRole ? '/coordinator/dashboard' : '/student/dashboard')
  }
  if (isCoordinatorPage && !isCoordinatorRole) {
    return redirectTo(isAdminRole ? '/admin/dashboard' : isLecturerRole ? '/lecturer/reports' : '/student/dashboard')
  }
  if (isLecturerPage && !isLecturerRole) {
    return redirectTo(isAdminRole ? '/admin/dashboard' : isCoordinatorRole ? '/coordinator/dashboard' : '/student/dashboard')
  }

  // Lecturers must change their temporary password before using the portal.
  if (isLecturerRole && needsLecturerRow) {
    const mustChange =
      metadata.must_change_password === true ||
      appMetadata.must_change_password === true ||
      lecturerRow?.must_change_password === true ||
      (lecturerRow?.must_change_password !== false && !!lecturerRow?.temp_password)
    if (mustChange) return redirectTo('/lecturer/change-password')
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|woff2?)$).*)',
  ],
}
