'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createClient, SEMESTER_STORAGE_KEY } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { Semester, StudentAccess, User } from '@/types'

export function isStaffUser(user: User | null | undefined) {
  if (!user) return false
  return (
    user.role === 'admin' ||
    user.role === 'coordinator' ||
    user.role === 'lecturer' ||
    user.status === 'admin' ||
    user.status === 'coordinator' ||
    user.status === 'selected_coordinator'
  )
}

export function canManageSemesters(user: User | null | undefined) {
  return isStaffUser(user) && user?.role !== 'lecturer'
}

/** True while the lock is on and its end date (if any) has not passed. */
export function isAccessLocked(access: StudentAccess | null) {
  if (!access?.is_locked) return false
  return !access.locked_until || new Date(access.locked_until).getTime() > Date.now()
}

export function semesterLabel(semester: Pick<Semester, 'name' | 'academic_year'> | null | undefined) {
  if (!semester) return 'No semester'
  return `${semester.name} · ${semester.academic_year}`
}

interface SemesterContextValue {
  semesters: Semester[]
  currentSemester: Semester | null
  /** The semester whose data the app is showing (staff can change it). */
  viewingSemester: Semester | null
  isViewingCurrent: boolean
  access: StudentAccess | null
  locked: boolean
  loading: boolean
  selectSemester: (semesterId: string) => void
  refresh: () => Promise<void>
}

const SemesterContext = createContext<SemesterContextValue | null>(null)

function readStoredSemester() {
  try {
    return window.localStorage.getItem(SEMESTER_STORAGE_KEY)
  } catch {
    return null
  }
}

export function SemesterProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [access, setAccess] = useState<StudentAccess | null>(null)
  const [storedId, setStoredId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const supabase = createClient()
    const [semesterRes, accessRes] = await Promise.all([
      supabase.from('semesters').select('*').order('academic_year', { ascending: false }).order('term_number', { ascending: false }),
      user ? supabase.from('student_access').select('is_locked, locked_until, message, updated_at').maybeSingle() : Promise.resolve({ data: null }),
    ])
    setSemesters((semesterRes.data as Semester[]) || [])
    setAccess((accessRes.data as StudentAccess | null) || null)
    setLoading(false)
  }, [user])

  useEffect(() => {
    setStoredId(readStoredSemester())
    void refresh()
  }, [refresh])

  const currentSemester = useMemo(() => semesters.find((semester) => semester.is_current) || null, [semesters])

  const viewingSemester = useMemo(() => {
    if (isStaffUser(user) && storedId) {
      const chosen = semesters.find((semester) => semester.id === storedId)
      if (chosen) return chosen
    }
    return currentSemester
  }, [user, storedId, semesters, currentSemester])

  // Students never send a semester header, and stale choices are cleared.
  useEffect(() => {
    if (loading || !storedId) return
    const stale = !semesters.some((semester) => semester.id === storedId)
    if ((user && !isStaffUser(user)) || stale) {
      try {
        window.localStorage.removeItem(SEMESTER_STORAGE_KEY)
      } catch {}
      setStoredId(null)
    }
  }, [loading, storedId, semesters, user])

  const selectSemester = useCallback(
    (semesterId: string) => {
      if (semesterId === viewingSemester?.id) return
      try {
        if (semesterId === currentSemester?.id) window.localStorage.removeItem(SEMESTER_STORAGE_KEY)
        else window.localStorage.setItem(SEMESTER_STORAGE_KEY, semesterId)
      } catch {}
      // Every page loads its data on mount, so a reload is the reliable way to switch.
      window.location.reload()
    },
    [viewingSemester?.id, currentSemester?.id]
  )

  const value = useMemo<SemesterContextValue>(
    () => ({
      semesters,
      currentSemester,
      viewingSemester,
      isViewingCurrent: !!viewingSemester && viewingSemester.id === currentSemester?.id,
      access,
      locked: isAccessLocked(access),
      loading,
      selectSemester,
      refresh,
    }),
    [semesters, currentSemester, viewingSemester, access, loading, selectSemester, refresh]
  )

  return <SemesterContext.Provider value={value}>{children}</SemesterContext.Provider>
}

export function useSemester() {
  const context = useContext(SemesterContext)
  if (!context) throw new Error('useSemester must be used within a SemesterProvider')
  return context
}
