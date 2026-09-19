'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, UserRole } from '@/types'

interface AuthContextType {
  user: User | null
  loading: boolean
  setPreviewProfile: (profile: User) => void
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchUser = async () => {
    try {
      let { data: { user: authUser } } = await supabase.auth.getUser()

      if (!authUser && (window.location.pathname.startsWith('/student') || window.location.pathname.startsWith('/coordinator'))) {
        const role = window.location.pathname.startsWith('/coordinator') ? 'coordinator' : 'student'
        const response = await fetch('/api/auth/auto-login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ role }),
        })

        if (response.ok) {
          const refreshed = await supabase.auth.getUser()
          authUser = refreshed.data.user
        }
      }

      if (authUser) {
        let profile = null

        const byId = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle()

        if (byId.data) {
          profile = byId.data
        } else if (authUser.email) {
          const byEmail = await supabase
            .from('users')
            .select('*')
            .ilike('email', authUser.email)
            .maybeSingle()

          profile = byEmail.data
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
    } catch (error) {
      console.error('Error fetching user:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        fetchUser()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
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