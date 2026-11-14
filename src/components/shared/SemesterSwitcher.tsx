'use client'

import { CalendarRange, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { isStaffUser, semesterLabel, useSemester } from '@/hooks/useSemester'

const statusDot: Record<string, string> = {
  active: 'bg-success',
  upcoming: 'bg-warning',
  ended: 'bg-text-muted',
}

/** Compact semester indicator; staff can switch which semester they are viewing. */
export function SemesterSwitcher({ className }: { className?: string }) {
  const { user } = useAuth()
  const { semesters, viewingSemester, isViewingCurrent, selectSemester, loading } = useSemester()

  if (loading || !viewingSemester) return null

  const pillClasses = cn(
    'relative inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border px-3 text-[11px] font-bold shadow-xs backdrop-blur-md transition-colors',
    isViewingCurrent
      ? 'border-primary/25 bg-primary-light/50 text-primary'
      : 'border-warning/40 bg-warning-light/70 text-warning',
    className
  )

  if (!isStaffUser(user) || semesters.length < 2) {
    return (
      <span className={pillClasses} title={semesterLabel(viewingSemester)}>
        <CalendarRange className="h-4 w-4" aria-hidden="true" />
        <span className="hidden md:inline">{semesterLabel(viewingSemester)}</span>
        <span className="md:hidden">{viewingSemester.name}</span>
      </span>
    )
  }

  return (
    <label className={cn(pillClasses, 'cursor-pointer pr-2 hover:border-primary/50 focus-within:ring-2 focus-within:ring-primary')}>
      <CalendarRange className="h-4 w-4" aria-hidden="true" />
      <span className={cn('h-1.5 w-1.5 rounded-full', statusDot[viewingSemester.status])} aria-hidden="true" />
      <span className="hidden md:inline">{semesterLabel(viewingSemester)}</span>
      <span className="md:hidden">{viewingSemester.name}</span>
      <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
      <select
        aria-label="Semester you are viewing"
        className="absolute inset-0 cursor-pointer opacity-0"
        value={viewingSemester.id}
        onChange={(event) => selectSemester(event.target.value)}
      >
        {semesters.map((semester) => (
          <option key={semester.id} value={semester.id}>
            {semesterLabel(semester)}
            {semester.is_current ? ' (current)' : semester.status === 'upcoming' ? ' (upcoming)' : ' (ended)'}
          </option>
        ))}
      </select>
    </label>
  )
}
