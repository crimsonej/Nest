'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, UserRole } from '@/types'
import { reportStudentQuery } from '@/lib/student-query-diagnostics'

interface AuthContextType {
  user: User | null
  loading: boolean
  setPreviewProfile: (profile: User) => void
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])
  const inFlight = useRef<Promise<void> | null>(null)
  const loadedFor = useRef<string | null>(null)

  // Only replace the user when something actually changed. Every page reloads its data
  // when `user` changes, so handing out a new-but-identical object made pages load twice.
  const setUser = useCallback((next: User | null) => {
    setUserState((previous) => (JSON.stringify(previous) === JSON.stringify(next) ? previous : next))
  }, [])

  const loadUser = async () => {
    try {
      // The session was already verified by the middleware, so read it locally instead of
      // asking the auth server again. Row-level security still guards every query.
      let { data: { session } } = await supabase.auth.getSession()
      let authUser = session?.user ?? null

      if (!authUser && (window.location.pathname.startsWith('/student') || window.location.pathname.startsWith('/coordinator'))) {
        const role = window.location.pathname.startsWith('/coordinator') ? 'coordinator' : 'student'
        const response = await fetch('/api/auth/auto-login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ role }),
        })

        if (response.ok) {
          const refreshed = await supabase.auth.getSession()
          authUser = refreshed.data.session?.user ?? null
        }
      }

      if (authUser) {
        let profile = null

        const byId = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle()
        reportStudentQuery('profile by auth id', { id: 'current authenticated user' }, byId.data, byId.error)
        if (byId.error) throw byId.error

        if (byId.data) {
          profile = byId.data
        } else if (authUser.email) {
          const byEmail = await supabase
            .from('users')
            .select('*')
            .ilike('email', authUser.email)
            .maybeSingle()
          reportStudentQuery('profile by email fallback', { email: 'current authenticated user' }, byEmail.data, byEmail.error)
          if (byEmail.error) throw byEmail.error

          if (byEmail.data?.id === authUser.id) {
            profile = byEmail.data
          } else if (byEmail.data) {
            console.warn('[auth][temporary] Ignored email-matched profile with a different auth id.')
          }
        }

        if (!profile && authUser.email) {
          const fallbackProfile = {
            id: authUser.id,
            email: authUser.email,
            full_name: (authUser.user_metadata?.full_name as string) || 'User Profile',
            role: (authUser.user_metadata?.role as UserRole) || 'student',
            gender: (authUser.user_metadata?.gender as User['gender']) || 'other',
            university: (authUser.user_metadata?.university as string) || 'Ndejje University',
            faculty: (authUser.user_metadata?.faculty as string) || 'Faculty of Computing',
            course: (authUser.user_metadata?.course as string) || 'BSc Computer Science',
            student_registration_number: (authUser.user_metadata?.student_registration_number as string) || undefined,
            whatsapp_phone: (authUser.user_metadata?.whatsapp_phone as string) || undefined,
            avatar_url: (authUser.user_metadata?.avatar_url as string) || undefined,
            status: (authUser.user_metadata?.status as User['status']) || 'normal',
            created_at: authUser.created_at,
            updated_at: authUser.updated_at || new Date().toISOString(),
          }

          const { data: insertedProfile, error: insertError } = await supabase
            .from('users')
            .upsert(fallbackProfile, { onConflict: 'id' })
            .select('*')
            .single()
          reportStudentQuery('profile creation fallback', { id: 'current authenticated user' }, insertedProfile, insertError)

          if (!insertError) {
            profile = insertedProfile
          }
        }

        if (profile) {
          setUser(profile)
        } else {
          setUser({
            id: authUser.id,
            email: authUser.email || '',
            full_name: (authUser.user_metadata?.full_name as string) || 'User Profile',
            role: (authUser.user_metadata?.role as UserRole) || 'student',
            gender: (authUser.user_metadata?.gender as User['gender']) || 'other',
            university: (authUser.user_metadata?.university as string) || 'Ndejje University',
            faculty: (authUser.user_metadata?.faculty as string) || undefined,
            faculty_id: (authUser.user_metadata?.faculty_id as string) || undefined,
            course: (authUser.user_metadata?.course as string) || undefined,
            course_id: (authUser.user_metadata?.course_id as string) || undefined,
            student_registration_number: (authUser.user_metadata?.student_registration_number as string) || undefined,
            avatar_url: (authUser.user_metadata?.avatar_url as string) || undefined,
            whatsapp_phone: (authUser.user_metadata?.whatsapp_phone as string) || undefined,
            status: (authUser.user_metadata?.status as User['status']) || 'normal',
            created_at: authUser.created_at,
            updated_at: authUser.updated_at || new Date().toISOString(),
          })
        }
      } else {
        setUser(null)
      }
      loadedFor.current = authUser?.id ?? null
    } catch (error) {
      console.error('[auth][temporary] Unable to load the authenticated profile.', {
        errorName: error instanceof Error ? error.name : 'unknown',
      })
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  // Collapse overlapping calls (mount + auth events) into one request.
  const fetchUser = useCallback(() => {
    inFlight.current ??= loadUser().finally(() => { inFlight.current = null })
    return inFlight.current
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void fetchUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session) => {
      if (event === 'SIGNED_OUT') {
        loadedFor.current = null
        setUser(null)
        return
      }
      // SIGNED_IN also fires when the tab regains focus; a token refresh doesn't change the
      // profile. Only reload when a different person has signed in.
      if (event === 'SIGNED_IN' && session?.user?.id && session.user.id !== loadedFor.current) {
        void fetchUser()
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchUser, setUser, supabase])

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      // Ignore auth signout error
    }
    if (typeof window !== 'undefined') {
      setUser(null)
      window.location.href = '/auth/login'
    }
  }

  const setPreviewProfile = (profile: User) => {
    setUser(profile)
  }

  const refreshUser = async () => {
    await fetchUser()
  }

  return (
    <AuthContext.Provider value={{ user, loading, setPreviewProfile, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}


export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function useRole(allowedRoles: UserRole[]) {
  const { user, loading } = useAuth()
  
  const hasAccess = user ? allowedRoles.includes(user.role) : false
  
  return { user, loading, hasAccess }
}