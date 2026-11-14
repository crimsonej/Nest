import { createBrowserClient } from '@supabase/ssr'

/** localStorage key holding the semester a staff member chose to view. */
export const SEMESTER_STORAGE_KEY = 'nest-semester-id'

function readSelectedSemester(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(SEMESTER_STORAGE_KEY)
  } catch {
    return null
  }
}

/**
 * Adds the `x-nest-semester` header to every Supabase request. The database
 * only honours it for staff (admin / coordinator / lecturer); students always
 * see the current semester regardless.
 */
const semesterAwareFetch: typeof fetch = (input, init) => {
  const semesterId = readSelectedSemester()
  if (!semesterId) return fetch(input, init)
  const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined))
  headers.set('x-nest-semester', semesterId)
  return fetch(input, { ...init, headers })
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { experimental: { passkey: true } }, global: { fetch: semesterAwareFetch } }
  )
}
