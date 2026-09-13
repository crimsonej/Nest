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
          .single()
        setUser(profile)
      } else {
        const savedProfile = window.localStorage.getItem(PREVIEW_PROFILE_KEY)
        if (savedProfile) {
          setUser(JSON.parse(savedProfile) as User)
        } else if (process.env.NODE_ENV === 'development') {
          const isCoordinator = window.location.pathname.startsWith('/coordinator')
          const demoProfile: User = {
            id: isCoordinator ? '11111111-1111-4111-8111-111111111111' : '22222222-2222-4222-8222-222222222222',
            email: isCoordinator ? 'coordinator@nest.edu' : 'student1@nest.edu',
            full_name: isCoordinator ? 'Development Coordinator' : 'Development Student',
            role: isCoordinator ? 'coordinator' : 'student',
            status: isCoordinator ? 'coordinator' : 'normal',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          setUser(demoProfile)
        } else {
          setUser(null)
        }
      }
    } catch (error) {
      console.error('Error fetching user:', error)
      if (process.env.NODE_ENV === 'development') {
        const isCoordinator = window.location.pathname.startsWith('/coordinator')
        setUser({
          id: isCoordinator ? '11111111-1111-4111-8111-111111111111' : '22222222-2222-4222-8222-222222222222',
          email: isCoordinator ? 'coordinator@nest.edu' : 'student1@nest.edu',
          full_name: isCoordinator ? 'Development Coordinator' : 'Development Student',
          role: isCoordinator ? 'coordinator' : 'student',
          status: isCoordinator ? 'coordinator' : 'normal',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
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
    setUser(null)
  }

  const setPreviewProfile = (profile: User) => {
    void supabase.auth.signOut()
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