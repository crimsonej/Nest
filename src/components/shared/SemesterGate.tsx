'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Image from 'next/image'
import { AlertTriangle, CalendarClock, CheckCircle2, Info, Lock, LogOut, Megaphone, ShieldCheck, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { isStaffUser, semesterLabel, useSemester } from '@/hooks/useSemester'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { Announcement } from '@/types'

type Role = 'student' | 'coordinator' | 'admin' | 'lecturer'

const toneStyles: Record<Announcement['tone'], { box: string; icon: typeof Info; iconClass: string }> = {
  info: { box: 'border-primary/25 bg-primary-light/60', icon: Info, iconClass: 'text-primary' },
  success: { box: 'border-success/30 bg-success-light/70', icon: CheckCircle2, iconClass: 'text-success' },
  warning: { box: 'border-warning/35 bg-warning-light/80', icon: AlertTriangle, iconClass: 'text-warning' },
}

const DISMISSED_KEY = 'nest-dismissed-announcements'

function readDismissed(): string[] {
  try {
    return JSON.parse(window.localStorage.getItem(DISMISSED_KEY) || '[]')
  } catch {
    return []
  }
}

function useAnnouncements(role: Role) {
  const [items, setItems] = useState<Announcement[]>([])
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    const audiences = role === 'student' ? ['students', 'everyone'] : ['staff', 'everyone']
    supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .in('audience', audiences)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        const now = Date.now()
        setItems(((data as Announcement[]) || []).filter((item) => !item.expires_at || new Date(item.expires_at).getTime() > now))
      })
  }, [user, role])

  return items
}

export function AnnouncementList({ items, dismissible = true }: { items: Announcement[]; dismissible?: boolean }) {
  const [dismissed, setDismissed] = useState<string[]>([])
  useEffect(() => setDismissed(readDismissed()), [])

  const visible = items.filter((item) => !dismissible || !dismissed.includes(item.id))
  if (visible.length === 0) return null

  function dismiss(id: string) {
    const next = [...dismissed, id]
    setDismissed(next)
    try {
      window.localStorage.setItem(DISMISSED_KEY, JSON.stringify(next.slice(-50)))
    } catch {}
  }

  return (
    <div className="space-y-2.5" role="region" aria-label="Announcements">
      {visible.map((item) => {
        const tone = toneStyles[item.tone] || toneStyles.info
        const Icon = tone.icon
        return (
          <div key={item.id} className={cn('flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-xs', tone.box)}>
            <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', tone.iconClass)} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-text-primary">{item.title}</p>
              <p className="mt-0.5 whitespace-pre-line text-xs leading-relaxed text-text-secondary">{item.body}</p>
            </div>
            {dismissible && (
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="-mr-1 rounded-lg p-1 text-text-muted transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={`Dismiss announcement: ${item.title}`}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

function LockScreen({ announcements }: { announcements: Announcement[] }) {
  const { signOut, user } = useAuth()
  const { access, currentSemester } = useSemester()
  const reopens = access?.locked_until ? new Date(access.locked_until) : null

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center py-10 text-center">
      <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-primary/25 bg-primary-light shadow-lg shadow-primary/10">
        <Lock className="h-9 w-9 text-primary" aria-hidden="true" />
      </div>
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">Student portal closed</p>
      <h1 className="mt-2 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
        {currentSemester?.status === 'ended' ? `${currentSemester.name} has ended` : 'We’ll be back soon'}
      </h1>
      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-text-secondary">
        {access?.message || 'The student portal is closed while the next semester is being prepared.'}
      </p>
      {reopens && (
        <p className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-border/80 bg-surface px-4 py-2.5 text-sm font-bold text-text-primary shadow-xs">
          <CalendarClock className="h-4 w-4 text-primary" aria-hidden="true" />
          Reopens {reopens.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      )}
      {announcements.length > 0 && (
        <div className="mt-8 w-full text-left">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-text-muted">
            <Megaphone className="h-3.5 w-3.5" aria-hidden="true" /> Announcements
          </p>
          <AnnouncementList items={announcements} dismissible={false} />
        </div>
      )}
      <p className="mt-8 text-xs text-text-muted">Signed in as {user?.email}</p>
      <Button variant="ghost" className="mt-2" onClick={signOut}>
        <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
      </Button>
    </div>
  )
}

interface UnitOption {
  id: string
  code: string
  name: string
  course_id: string | null
}

function VerifyDetailsDialog({ onDone }: { onDone: () => void }) {
  const { user, refreshUser } = useAuth()
  const { currentSemester } = useSemester()
  const supabase = useMemo(() => createClient(), [])

  const [fullName, setFullName] = useState(user?.full_name || '')
  const [regNumber, setRegNumber] = useState(user?.student_registration_number || '')
  const [courseId, setCourseId] = useState(user?.course_id || '')
  const [courses, setCourses] = useState<{ id: string; code: string; name: string }[]>([])
  const [units, setUnits] = useState<UnitOption[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [showAllUnits, setShowAllUnits] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('courses').select('id, code, name').eq('is_active', true).order('name'),
      supabase.from('course_units').select('id, code, name, course_id').eq('is_active', true).order('code'),
    ]).then(([courseRes, unitRes]) => {
      setCourses(courseRes.data || [])
      setUnits((unitRes.data as UnitOption[]) || [])
    })
  }, [supabase])

  const visibleUnits = showAllUnits || !courseId ? units : units.filter((unit) => unit.course_id === courseId)
  const hiddenCount = units.length - visibleUnits.length

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]))
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    if (!fullName.trim()) return setError('Enter your full name.')
    if (!courseId) return setError('Choose your course.')
    if (selected.length === 0) return setError('Choose at least one course unit for this semester.')

    setSaving(true)
    const { error: rpcError } = await supabase.rpc('verify_semester_profile', {
      p_full_name: fullName,
      p_registration_number: regNumber,
      p_course_id: courseId,
      p_course_unit_ids: selected,
    })
    setSaving(false)
    if (rpcError) {
      setError(rpcError.message.includes('registration number') ? rpcError.message : `We couldn’t save your details: ${rpcError.message}`)
      return
    }
    await refreshUser()
    onDone()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/50 p-3 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="verify-title">
      <form onSubmit={submit} className="my-4 w-full max-w-2xl rounded-3xl border border-border/80 bg-surface shadow-2xl">
        <div className="border-b border-border/60 bg-gradient-to-br from-primary-light via-surface to-surface px-5 py-5 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white shadow-md shadow-primary/30">
              <Image src="/logo.png" alt="" width={24} height={24} className="rounded-lg" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-primary">Welcome back</p>
              <h2 id="verify-title" className="text-lg font-black text-text-primary sm:text-xl">Confirm your details for {semesterLabel(currentSemester)}</h2>
            </div>
          </div>
          <p className="mt-3 text-sm text-text-secondary">
            A new semester has started. Check your details are still correct and pick the course units you are taking this semester.
          </p>
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Full name" value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" required />
            <Input label="Registration number" value={regNumber} onChange={(event) => setRegNumber(event.target.value)} placeholder="26/1/222/BSCS/1234" />
          </div>
          <div>
            <label htmlFor="verify-course" className="block text-sm font-semibold text-text-primary">Course</label>
            <select
              id="verify-course"
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-border/80 bg-surface/90 px-4 py-2.5 text-sm text-text-primary shadow-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
              required
            >
              <option value="">Choose your course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>{course.code} · {course.name}</option>
              ))}
            </select>
          </div>

          <fieldset>
            <legend className="text-sm font-semibold text-text-primary">Course units this semester</legend>
            <p className="text-xs text-text-muted">{selected.length} selected</p>
            {units.length === 0 ? (
              <p className="mt-2 rounded-2xl border border-dashed border-border px-4 py-5 text-center text-sm text-text-secondary">
                No course units have been set up for this semester yet. Please check back soon.
              </p>
            ) : (
              <div className="mt-2 grid max-h-64 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {visibleUnits.map((unit) => {
                  const checked = selected.includes(unit.id)
                  return (
                    <label
                      key={unit.id}
                      className={cn(
                        'flex cursor-pointer items-start gap-2.5 rounded-2xl border px-3 py-2.5 text-sm transition-colors focus-within:ring-2 focus-within:ring-primary',
                        checked ? 'border-primary bg-primary-light/60' : 'border-border/80 bg-surface hover:border-primary/40'
                      )}
                    >
                      <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]" checked={checked} onChange={() => toggle(unit.id)} />
                      <span className="min-w-0">
                        <span className="block text-xs font-black text-primary">{unit.code}</span>
                        <span className="block text-text-primary">{unit.name}</span>
                      </span>
                    </label>
                  )
                })}
                {visibleUnits.length === 0 && (
                  <p className="col-span-full text-sm text-text-secondary">No units are linked to this course yet.</p>
                )}
              </div>
            )}
            {(hiddenCount > 0 || showAllUnits) && courseId && (
              <button type="button" className="mt-2 text-xs font-bold text-primary hover:underline" onClick={() => setShowAllUnits((value) => !value)}>
                {showAllUnits ? 'Only show units for my course' : `Show ${hiddenCount} unit${hiddenCount === 1 ? '' : 's'} from other courses`}
              </button>
            )}
          </fieldset>

          {error && (
            <p role="alert" className="rounded-2xl border border-danger/30 bg-danger-light/70 px-4 py-2.5 text-sm font-medium text-danger">{error}</p>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <p className="flex items-center gap-1.5 text-xs text-text-muted">
            <ShieldCheck className="h-4 w-4 text-success" aria-hidden="true" /> Your coordinators will see the updated details.
          </p>
          <Button type="submit" loading={saving} disabled={units.length === 0}>Confirm and continue</Button>
        </div>
      </form>
    </div>
  )
}

/**
 * Wraps every workspace page:
 *  - students see a lock screen while the portal is locked;
 *  - returning students confirm their details once per semester;
 *  - everyone sees active announcements for their audience;
 *  - staff get a reminder when they are looking at a past or upcoming semester.
 */
export function SemesterGate({ role, children }: { role: Role; children: ReactNode }) {
  const { user } = useAuth()
  const { currentSemester, viewingSemester, isViewingCurrent, locked, loading, selectSemester } = useSemester()
  const announcements = useAnnouncements(role)
  const [needsVerification, setNeedsVerification] = useState(false)

  const staff = isStaffUser(user)

  useEffect(() => {
    if (!user || role !== 'student' || user.role !== 'student' || !currentSemester || locked) {
      setNeedsVerification(false)
      return
    }
    const supabase = createClient()
    supabase
      .from('student_semester_records')
      .select('id')
      .eq('user_id', user.id)
      .eq('semester_id', currentSemester.id)
      .maybeSingle()
      .then(({ data, error }) => setNeedsVerification(!error && !data))
  }, [user, role, currentSemester, locked])

  // Note: keep `children` at the same position in every render below. Moving it (for
  // example returning it bare while loading) makes React remount the page, which then
  // fetches all of its data a second time.
  if (!loading && role === 'student' && locked && !staff) {
    return <LockScreen announcements={announcements} />
  }

  return (
    <>
      {!loading && (announcements.length > 0 || (staff && !isViewingCurrent && viewingSemester) || (staff && locked && role === 'student')) && (
        <div className="mb-5 space-y-2.5">
          {staff && !isViewingCurrent && viewingSemester && (
            <div className="flex flex-col gap-2 rounded-2xl border border-warning/35 bg-warning-light/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                <CalendarClock className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                You are viewing {semesterLabel(viewingSemester)}{viewingSemester.status === 'upcoming' ? ' (upcoming)' : ' (past)'} — changes apply to that semester.
              </p>
              {currentSemester && (
                <button type="button" onClick={() => selectSemester(currentSemester.id)} className="self-start rounded-xl border border-warning/40 bg-surface px-3 py-1.5 text-xs font-bold text-warning hover:bg-warning-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning sm:self-auto">
                  Back to {currentSemester.name}
                </button>
              )}
            </div>
          )}
          {staff && locked && role === 'student' && (
            <p className="flex items-center gap-2 rounded-2xl border border-danger/30 bg-danger-light/70 px-4 py-3 text-sm font-semibold text-text-primary">
              <Lock className="h-4 w-4 text-danger" aria-hidden="true" /> The student portal is locked for students. You can still see it because you are staff.
            </p>
          )}
          <AnnouncementList items={announcements} />
        </div>
      )}
      {children}
      {!loading && needsVerification && <VerifyDetailsDialog onDone={() => setNeedsVerification(false)} />}
    </>
  )
}
