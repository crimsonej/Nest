'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, UserRole } from '@/types'

const PREVIEW_PROFILE_KEY = 'nest-preview-profile'

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

      if (!authUser && process.env.NODE_ENV === 'development' && (window.location.pathname.startsWith('/student') || window.location.pathname.startsWith('/coordinator'))) {
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
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle()

        if (profile) {
          setUser(profile)
        } else {
          const savedProfile = typeof window !== 'undefined' ? window.localStorage.getItem(PREVIEW_PROFILE_KEY) : null
          if (savedProfile) {
            setUser(JSON.parse(savedProfile) as User)
          } else {
            setUser({
              id: authUser.id,
              email: authUser.email || '',
              full_name: (authUser.user_metadata?.full_name as string) || 'User Profile',
              role: (authUser.user_metadata?.role as UserRole) || 'student',
              status: (authUser.user_metadata?.status as User['status']) || 'normal',
              created_at: authUser.created_at,
              updated_at: authUser.updated_at || new Date().toISOString(),
            })
          }
        }
      } else {
        const savedProfile = typeof window !== 'undefined' ? window.localStorage.getItem(PREVIEW_PROFILE_KEY) : null
        if (savedProfile) {
          setUser(JSON.parse(savedProfile) as User)
        } else {
          setUser(null)
        }
      }
    } catch (error) {
      console.error('Error fetching user:', error)
      const savedProfile = typeof window !== 'undefined' ? window.localStorage.getItem(PREVIEW_PROFILE_KEY) : null
      if (savedProfile) {
        setUser(JSON.parse(savedProfile) as User)
      } else {
        setUser(null)
      }
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
    await supabase.auth.signOut()
    window.localStorage.removeItem(PREVIEW_PROFILE_KEY)
    // Clear preview cookies
    document.cookie = 'nest-preview-user-id=; path=/; max-age=0'
    document.cookie = 'nest-preview-role=; path=/; max-age=0'
    document.cookie = 'nest-preview-status=; path=/; max-age=0'
    setUser(null)
  }

  const setPreviewProfile = (profile: User) => {
    // Don't call signOut here — it disrupts navigation and session refresh
    window.localStorage.setItem(PREVIEW_PROFILE_KEY, JSON.stringify(profile))
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