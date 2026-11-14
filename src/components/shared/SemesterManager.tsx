'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CalendarDays,
  CalendarPlus,
  CalendarRange,
  Pencil,
  Trash2,
  ClipboardList,
  Download,
  Eye,
  Lock,
  Megaphone,
  PlayCircle,
  Send,
  StopCircle,
  Unlock,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { canManageSemesters, semesterLabel, useSemester } from '@/hooks/useSemester'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { useSemesterEvents } from '@/hooks/useSemesterEvents'
import { SEMESTER_EVENT_KINDS, eventDateRange, eventKindLabel, eventStatus } from '@/lib/reports/calendar'
import type { Announcement, Semester, SemesterEvent, SemesterEventKind } from '@/types'

const fieldClasses =
  'w-full rounded-2xl border border-border/80 bg-surface/90 px-4 py-2.5 text-sm text-text-primary shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15'

const sectionClasses = 'rounded-3xl border border-border/80 bg-surface p-5 shadow-sm sm:p-6'

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function toDateTimeLocal(date: string | null | undefined) {
  if (!date) return ''
  // A plain date means "from the start of that day".
  return date.length <= 10 ? `${date}T08:00` : date.slice(0, 16)
}

function statusBadge(semester: Semester) {
  if (semester.is_current && semester.status === 'ended') return <Badge variant="danger" dot>Ended · still current</Badge>
  if (semester.is_current) return <Badge variant="success" dot>Current</Badge>
  if (semester.status === 'upcoming') return <Badge variant="warning" dot>Upcoming</Badge>
  return <Badge variant="secondary">Ended</Badge>
}

export function SemesterManager() {
  const supabase = useMemo(() => createClient(), [])
  const { user } = useAuth()
  const toast = useToast()
  const { semesters, currentSemester, viewingSemester, access, locked, refresh, selectSemester } = useSemester()

  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [busy, setBusy] = useState<string | null>(null)

  // New semester form
  const [newSemester, setNewSemester] = useState({ name: '', academic_year: '', term_number: '2', starts_on: '', ends_on: '' })

  // Lock form
  const [lockMessage, setLockMessage] = useState('')
  const [lockUntil, setLockUntil] = useState('')

  // Import form
  const [importFrom, setImportFrom] = useState('')
  const [importTo, setImportTo] = useState('')
  const [importCourseworks, setImportCourseworks] = useState(false)

  // Announcement form
  const [announcement, setAnnouncement] = useState({ title: '', body: '', audience: 'students', tone: 'info' })

  // Confirmation dialogs
  const [endTarget, setEndTarget] = useState<Semester | null>(null)
  const [endOptions, setEndOptions] = useState({ lock: true, until: '', announce: true, message: '' })
  const [startTarget, setStartTarget] = useState<Semester | null>(null)
  const [unlockOnStart, setUnlockOnStart] = useState(true)

  // Edit semester details
  const [editTarget, setEditTarget] = useState<Semester | null>(null)
  const [editForm, setEditForm] = useState({ name: '', academic_year: '', term_number: '1', starts_on: '', ends_on: '' })

  // Semester calendar
  const [calendarSemesterId, setCalendarSemesterId] = useState('')
  const calendarSemester = semesters.find((semester) => semester.id === calendarSemesterId) || null
  const { events, loading: eventsLoading, reload: reloadEvents } = useSemesterEvents(calendarSemesterId || null)
  const emptyEvent = { id: '', kind: 'orientation' as SemesterEventKind, title: 'Orientation week', starts_on: '', ends_on: '', description: '' }
  const [eventForm, setEventForm] = useState(emptyEvent)
  const [deleteEvent, setDeleteEvent] = useState<SemesterEvent | null>(null)

  const nextUpcoming = useMemo(
    () => semesters.filter((semester) => semester.status === 'upcoming' && !semester.is_current).sort((a, b) => (a.starts_on || '').localeCompare(b.starts_on || ''))[0] || null,
    [semesters]
  )

  useEffect(() => {
    const year = currentSemester?.academic_year || ''
    const term = currentSemester ? Math.min(currentSemester.term_number + 1, 3) : 1
    setNewSemester((form) => (form.academic_year ? form : { ...form, academic_year: year, term_number: String(term), name: `Semester ${term}` }))
  }, [currentSemester])

  useEffect(() => {
    if (!calendarSemesterId && viewingSemester) setCalendarSemesterId(viewingSemester.id)
  }, [calendarSemesterId, viewingSemester])

  useEffect(() => {
    setLockMessage(access?.message || '')
    setLockUntil(toDateTimeLocal(access?.locked_until))
  }, [access])

  useEffect(() => {
    if (!importTo && viewingSemester) setImportTo(viewingSemester.id)
    if (!importFrom) {
      const other = semesters.find((semester) => semester.id !== (viewingSemester?.id || ''))
      if (other) setImportFrom(other.id)
    }
  }, [semesters, viewingSemester, importFrom, importTo])

  async function loadAnnouncements() {
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(20)
    setAnnouncements((data as Announcement[]) || [])
  }

  useEffect(() => {
    void loadAnnouncements()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!canManageSemesters(user)) {
    return (
      <EmptyState
        icon={Lock}
        title="Semesters are managed by admins and coordinators"
        description="You can still read the semester report for the semester you are viewing."
      />
    )
  }

  async function run(key: string, action: () => Promise<void>) {
    setBusy(key)
    try {
      await action()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  function fail(error: { message: string } | null) {
    if (error) throw new Error(error.message)
  }

  const createSemester = () =>
    run('create', async () => {
      if (!newSemester.name.trim() || !newSemester.academic_year.trim()) throw new Error('Give the semester a name and academic year.')
      const { error } = await supabase.from('semesters').insert({
        name: newSemester.name.trim(),
        academic_year: newSemester.academic_year.trim(),
        term_number: Number(newSemester.term_number),
        starts_on: newSemester.starts_on || null,
        ends_on: newSemester.ends_on || null,
        status: 'upcoming',
        created_by: user?.id,
      })
      if (error?.code === '23505') throw new Error('That semester already exists for this academic year.')
      fail(error)
      toast.success(`${newSemester.name} created. Switch to it to set up its course units.`)
      setNewSemester({ name: '', academic_year: '', term_number: '2', starts_on: '', ends_on: '' })
      await refresh()
    })

  const saveLock = (lock: boolean) =>
    run(lock ? 'lock' : 'unlock', async () => {
      const { error } = await supabase
        .from('student_access')
        .update({
          is_locked: lock,
          locked_until: lock && lockUntil ? new Date(lockUntil).toISOString() : null,
          message: lock ? lockMessage.trim() || null : access?.message || null,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', true)
      fail(error)
      toast.success(lock ? 'Student portal locked.' : 'Student portal is open again.')
      await refresh()
    })

  function openEndDialog(semester: Semester) {
    setEndTarget(semester)
    setEndOptions({
      lock: true,
      until: toDateTimeLocal(nextUpcoming?.starts_on),
      announce: true,
      message: `${semester.name} (${semester.academic_year}) has ended. Thank you for your work this semester. ${
        nextUpcoming ? `The portal reopens when ${nextUpcoming.name} begins${nextUpcoming.starts_on ? ` on ${formatDate(nextUpcoming.starts_on)}` : ''}.` : 'We will let you know when the next semester opens.'
      }`,
    })
  }

  const confirmEnd = () =>
    run('end', async () => {
      if (!endTarget) return
      const ended = await supabase.from('semesters').update({ status: 'ended', ended_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', endTarget.id)
      fail(ended.error)

      if (endOptions.lock) {
        const lockRes = await supabase
          .from('student_access')
          .update({
            is_locked: true,
            locked_until: endOptions.until ? new Date(endOptions.until).toISOString() : null,
            message: endOptions.message.trim() || null,
            updated_by: user?.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', true)
        fail(lockRes.error)
      }

      if (endOptions.announce && endOptions.message.trim()) {
        const announceRes = await supabase.from('announcements').insert({
          title: `${endTarget.name} has ended`,
          body: endOptions.message.trim(),
          audience: 'students',
          tone: 'warning',
          semester_id: endTarget.id,
          created_by: user?.id,
        })
        fail(announceRes.error)
      }

      toast.success(`${endTarget.name} ended${endOptions.lock ? ' and the student portal is locked' : ''}.`)
      setEndTarget(null)
      await Promise.all([refresh(), loadAnnouncements()])
    })

  const confirmStart = () =>
    run('start', async () => {
      if (!startTarget) return
      const { error } = await supabase.rpc('start_semester', { p_semester_id: startTarget.id })
      fail(error)
      if (unlockOnStart) {
        const unlockRes = await supabase.from('student_access').update({ is_locked: false, updated_by: user?.id, updated_at: new Date().toISOString() }).eq('id', true)
        fail(unlockRes.error)
      }
      toast.success(`${startTarget.name} is now the current semester. Returning students will be asked to confirm their details.`)
      setStartTarget(null)
      // Follow the new current semester.
      selectSemester(startTarget.id)
      await refresh()
    })

  const runImport = () =>
    run('import', async () => {
      if (!importFrom || !importTo) throw new Error('Choose both semesters.')
      if (importFrom === importTo) throw new Error('Choose two different semesters.')
      const { data, error } = await supabase.rpc('import_course_units', {
        p_from_semester: importFrom,
        p_to_semester: importTo,
        p_unit_ids: null,
        p_include_courseworks: importCourseworks,
      })
      fail(error)
      const copied = Number(data || 0)
      if (copied === 0) toast.info('Nothing new to import. Those course units already exist in the target semester.')
      else toast.success(`Imported ${copied} course unit${copied === 1 ? '' : 's'}${importCourseworks ? ' with their coursework (unpublished)' : ''}.`)
    })

  const postAnnouncement = () =>
    run('announce', async () => {
      if (!announcement.title.trim() || !announcement.body.trim()) throw new Error('Add a title and a message.')
      const { error } = await supabase.from('announcements').insert({
        title: announcement.title.trim(),
        body: announcement.body.trim(),
        audience: announcement.audience,
        tone: announcement.tone,
        semester_id: currentSemester?.id || null,
        created_by: user?.id,
      })
      fail(error)
      toast.success('Announcement posted.')
      setAnnouncement({ title: '', body: '', audience: 'students', tone: 'info' })
      await loadAnnouncements()
    })

  function openEdit(semester: Semester) {
    setEditTarget(semester)
    setEditForm({
      name: semester.name,
      academic_year: semester.academic_year,
      term_number: String(semester.term_number),
      starts_on: semester.starts_on || '',
      ends_on: semester.ends_on || '',
    })
  }

  const saveEdit = () =>
    run('edit', async () => {
      if (!editTarget) return
      if (!editForm.name.trim() || !editForm.academic_year.trim()) throw new Error('Give the semester a name and academic year.')
      if (editForm.starts_on && editForm.ends_on && editForm.ends_on < editForm.starts_on) throw new Error('The end date must be on or after the start date.')
      const { error } = await supabase
        .from('semesters')
        .update({
          name: editForm.name.trim(),
          academic_year: editForm.academic_year.trim(),
          term_number: Number(editForm.term_number),
          starts_on: editForm.starts_on || null,
          ends_on: editForm.ends_on || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editTarget.id)
      if (error?.code === '23505') throw new Error('Another semester already uses that name and academic year.')
      fail(error)
      toast.success(`${editForm.name.trim()} updated.`)
      setEditTarget(null)
      await refresh()
    })

  const outsideSemester =
    !!calendarSemester &&
    !!eventForm.starts_on &&
    ((!!calendarSemester.starts_on && eventForm.starts_on < calendarSemester.starts_on) ||
      (!!calendarSemester.ends_on && (eventForm.ends_on || eventForm.starts_on) > calendarSemester.ends_on))

  const saveEvent = () =>
    run('event', async () => {
      if (!calendarSemesterId) throw new Error('Choose a semester first.')
      if (!eventForm.title.trim()) throw new Error('Give the event a name.')
      if (!eventForm.starts_on) throw new Error('Choose the date the event starts.')
      if (eventForm.ends_on && eventForm.ends_on < eventForm.starts_on) throw new Error('The end date must be on or after the start date.')
      const payload = {
        semester_id: calendarSemesterId,
        kind: eventForm.kind,
        title: eventForm.title.trim(),
        starts_on: eventForm.starts_on,
        ends_on: eventForm.ends_on && eventForm.ends_on !== eventForm.starts_on ? eventForm.ends_on : null,
        description: eventForm.description.trim() || null,
        updated_at: new Date().toISOString(),
      }
      const { error } = eventForm.id
        ? await supabase.from('semester_events').update(payload).eq('id', eventForm.id)
        : await supabase.from('semester_events').insert({ ...payload, created_by: user?.id })
      fail(error)
      toast.success(eventForm.id ? 'Event updated.' : 'Event added to the calendar.')
      setEventForm(emptyEvent)
      await reloadEvents()
    })

  const confirmDeleteEvent = () =>
    run('delete-event', async () => {
      if (!deleteEvent) return
      const { error } = await supabase.from('semester_events').delete().eq('id', deleteEvent.id)
      fail(error)
      toast.success('Event removed.')
      if (eventForm.id === deleteEvent.id) setEventForm(emptyEvent)
      setDeleteEvent(null)
      await reloadEvents()
    })

  const toggleAnnouncement = (item: Announcement) =>
    run(`toggle-${item.id}`, async () => {
      const { error } = await supabase.from('announcements').update({ is_active: !item.is_active }).eq('id', item.id)
      fail(error)
      await loadAnnouncements()
    })

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-primary-light via-surface to-surface p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-primary">
              <CalendarRange className="h-4 w-4" aria-hidden="true" /> Semesters
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
              {currentSemester ? semesterLabel(currentSemester) : 'No current semester'}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-text-secondary">
              Close a semester, lock the student portal while you prepare the next one, then start the new semester. Returning students will be asked to confirm their name, registration number, course and course units.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-bold',
                locked ? 'border-danger/30 bg-danger-light text-danger' : 'border-success/30 bg-success-light text-success'
              )}
            >
              {locked ? <Lock className="h-4 w-4" aria-hidden="true" /> : <Unlock className="h-4 w-4" aria-hidden="true" />}
              Student portal {locked ? 'locked' : 'open'}
            </span>
            <Link
              href={user?.role === 'admin' || user?.status === 'admin' ? '/admin/semester-report' : '/coordinator/semester-report'}
              className="inline-flex items-center gap-2 rounded-2xl border border-border/80 bg-surface px-3.5 py-2 text-xs font-bold text-text-primary transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ClipboardList className="h-4 w-4" aria-hidden="true" /> Semester report
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {/* Semester list */}
        <section className={sectionClasses} aria-labelledby="semester-list-heading">
          <h2 id="semester-list-heading" className="text-base font-black text-text-primary">All semesters</h2>
          <p className="mt-0.5 text-xs text-text-secondary">Each semester keeps its own course units, coursework, groups and enrolments.</p>
          <ul className="mt-4 divide-y divide-border/60">
            {semesters.map((semester) => (
              <li key={semester.id} className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-text-primary">{semesterLabel(semester)}</p>
                    {statusBadge(semester)}
                    {semester.id === viewingSemester?.id && <Badge variant="primary">Viewing</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {formatDate(semester.starts_on)} – {formatDate(semester.ends_on)}
                    {semester.ended_at ? ` · closed ${formatDate(semester.ended_at)}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(semester)} aria-label={`Edit ${semesterLabel(semester)}`}>
                    <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
                  </Button>
                  {semester.id !== viewingSemester?.id && (
                    <Button size="sm" variant="ghost" onClick={() => selectSemester(semester.id)}>
                      <Eye className="h-4 w-4" aria-hidden="true" /> View
                    </Button>
                  )}
                  {semester.is_current && semester.status === 'active' && (
                    <Button size="sm" variant="danger" onClick={() => openEndDialog(semester)}>
                      <StopCircle className="h-4 w-4" aria-hidden="true" /> End semester
                    </Button>
                  )}
                  {!semester.is_current && (
                    <Button size="sm" variant="success" onClick={() => { setUnlockOnStart(true); setStartTarget(semester) }}>
                      <PlayCircle className="h-4 w-4" aria-hidden="true" /> {semester.status === 'ended' ? 'Reopen' : 'Start'}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Student access */}
        <section className={sectionClasses} aria-labelledby="student-access-heading">
          <h2 id="student-access-heading" className="flex items-center gap-2 text-base font-black text-text-primary">
            {locked ? <Lock className="h-4 w-4 text-danger" aria-hidden="true" /> : <Unlock className="h-4 w-4 text-success" aria-hidden="true" />}
            Student access
          </h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            {locked
              ? access?.locked_until
                ? `Locked until ${new Date(access.locked_until).toLocaleString()}. It reopens on its own at that time.`
                : 'Locked until someone opens it again.'
              : 'Students can sign in and use the portal.'}
          </p>
          <div className="mt-4 space-y-3">
            <Textarea
              label="Message students see while locked"
              rows={3}
              value={lockMessage}
              onChange={(event) => setLockMessage(event.target.value)}
              placeholder="Semester 1 has ended. The portal reopens when Semester 2 begins."
            />
            <div>
              <label htmlFor="lock-until" className="block text-sm font-semibold text-text-primary">Reopen automatically on (optional)</label>
              <input id="lock-until" type="datetime-local" className={cn(fieldClasses, 'mt-1.5')} value={lockUntil} onChange={(event) => setLockUntil(event.target.value)} />
              {nextUpcoming?.starts_on && (
                <button type="button" className="mt-1.5 text-xs font-bold text-primary hover:underline" onClick={() => setLockUntil(toDateTimeLocal(nextUpcoming.starts_on))}>
                  Use start of {nextUpcoming.name} ({formatDate(nextUpcoming.starts_on)})
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="danger" onClick={() => saveLock(true)} loading={busy === 'lock'}>
                <Lock className="h-4 w-4" aria-hidden="true" /> {locked ? 'Update lock' : 'Lock student portal'}
              </Button>
              {locked && (
                <Button variant="success" onClick={() => saveLock(false)} loading={busy === 'unlock'}>
                  <Unlock className="h-4 w-4" aria-hidden="true" /> Open now
                </Button>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Semester calendar */}
      <section className={sectionClasses} aria-labelledby="calendar-heading">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="calendar-heading" className="flex items-center gap-2 text-base font-black text-text-primary">
              <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" /> Semester calendar
            </h2>
            <p className="mt-0.5 text-xs text-text-secondary">Key dates such as opening, orientation, tests and exams. They appear in the semester report and on the reports page.</p>
          </div>
          <div className="sm:w-64">
            <label htmlFor="calendar-semester" className="sr-only">Semester</label>
            <select id="calendar-semester" className={fieldClasses} value={calendarSemesterId} onChange={(event) => { setCalendarSemesterId(event.target.value); setEventForm(emptyEvent) }}>
              {semesters.map((semester) => <option key={semester.id} value={semester.id}>{semesterLabel(semester)}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_1.15fr]">
          <div className="space-y-3 rounded-2xl border border-border/70 bg-surface-hover/30 p-4">
            <p className="text-sm font-bold text-text-primary">{eventForm.id ? 'Edit event' : 'Add an event'}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="event-kind" className="block text-sm font-semibold text-text-primary">Type</label>
                <select
                  id="event-kind"
                  className={cn(fieldClasses, 'mt-1.5')}
                  value={eventForm.kind}
                  onChange={(event) => {
                    const kind = event.target.value as SemesterEventKind
                    const wasDefault = SEMESTER_EVENT_KINDS.some((item) => item.defaultTitle === eventForm.title) || !eventForm.title
                    const preset = SEMESTER_EVENT_KINDS.find((item) => item.value === kind)
                    setEventForm({ ...eventForm, kind, title: wasDefault ? preset?.defaultTitle || '' : eventForm.title })
                  }}
                >
                  {SEMESTER_EVENT_KINDS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>
              <Input label="Name" value={eventForm.title} onChange={(event) => setEventForm({ ...eventForm, title: event.target.value })} placeholder="Orientation week" />
              <Input label="Starts on" type="date" value={eventForm.starts_on} onChange={(event) => setEventForm({ ...eventForm, starts_on: event.target.value })} />
              <Input label="Ends on (optional)" type="date" min={eventForm.starts_on || undefined} value={eventForm.ends_on} onChange={(event) => setEventForm({ ...eventForm, ends_on: event.target.value })} />
            </div>
            <Textarea label="Notes (optional)" rows={2} value={eventForm.description} onChange={(event) => setEventForm({ ...eventForm, description: event.target.value })} placeholder="Venue, who it is for, anything students should know" />
            {outsideSemester && (
              <p className="text-xs font-semibold text-warning">This falls outside the semester dates ({formatDate(calendarSemester?.starts_on)} – {formatDate(calendarSemester?.ends_on)}). You can still save it.</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button onClick={saveEvent} loading={busy === 'event'}>
                <CalendarPlus className="h-4 w-4" aria-hidden="true" /> {eventForm.id ? 'Save changes' : 'Add event'}
              </Button>
              {eventForm.id && <Button variant="ghost" onClick={() => setEventForm(emptyEvent)}>Cancel</Button>}
            </div>
          </div>

          <div>
            {calendarSemester && (
              <p className="mb-3 text-xs text-text-muted">
                {calendarSemester.name} runs {formatDate(calendarSemester.starts_on)} – {formatDate(calendarSemester.ends_on)}.{' '}
                <button type="button" className="font-bold text-primary hover:underline" onClick={() => openEdit(calendarSemester)}>Change dates</button>
              </p>
            )}
            {eventsLoading ? (
              <div className="space-y-2">{[1, 2, 3].map((item) => <div key={item} className="h-14 animate-pulse rounded-2xl bg-surface-hover/60" />)}</div>
            ) : events.length === 0 ? (
              <EmptyState icon={CalendarDays} title="No events yet" description="Add the opening date, orientation, exams and other key dates for this semester." />
            ) : (
              <ol className="relative space-y-2 border-l-2 border-primary/30 pl-4">
                {events.map((item) => {
                  const status = eventStatus(item)
                  return (
                    <li key={item.id} className="relative rounded-2xl border border-border/70 bg-surface p-3">
                      <span className={cn('absolute -left-[1.4rem] top-4 h-3 w-3 rounded-full border-2 border-primary', status === 'Completed' ? 'bg-primary' : 'bg-surface')} aria-hidden="true" />
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">{eventDateRange(item)}</p>
                          <p className="text-sm font-bold text-text-primary">{item.title}</p>
                          <p className="text-xs text-text-muted">
                            {eventKindLabel(item.kind)} · {status}
                            {item.description ? ` · ${item.description}` : ''}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button size="sm" variant="ghost" aria-label={`Edit ${item.title}`} onClick={() => setEventForm({ id: item.id, kind: item.kind, title: item.title, starts_on: item.starts_on, ends_on: item.ends_on || '', description: item.description || '' })}>
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button size="sm" variant="ghost" aria-label={`Remove ${item.title}`} onClick={() => setDeleteEvent(item)}>
                            <Trash2 className="h-4 w-4 text-danger" aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* New semester */}
        <section className={sectionClasses} aria-labelledby="new-semester-heading">
          <h2 id="new-semester-heading" className="flex items-center gap-2 text-base font-black text-text-primary">
            <CalendarPlus className="h-4 w-4 text-primary" aria-hidden="true" /> New semester
          </h2>
          <p className="mt-0.5 text-xs text-text-secondary">It starts empty. Switch to it to add course units, or import them below.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Input label="Name" value={newSemester.name} onChange={(event) => setNewSemester({ ...newSemester, name: event.target.value })} placeholder="Semester 2" />
            <Input label="Academic year" value={newSemester.academic_year} onChange={(event) => setNewSemester({ ...newSemester, academic_year: event.target.value })} placeholder="2026/2027" />
            <div>
              <label htmlFor="term-number" className="block text-sm font-semibold text-text-primary">Term</label>
              <select
                id="term-number"
                className={cn(fieldClasses, 'mt-1.5')}
                value={newSemester.term_number}
                onChange={(event) => setNewSemester({ ...newSemester, term_number: event.target.value, name: `Semester ${event.target.value}` })}
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3 (recess)</option>
              </select>
            </div>
            <div className="hidden sm:block" />
            <Input label="Starts on" type="date" value={newSemester.starts_on} onChange={(event) => setNewSemester({ ...newSemester, starts_on: event.target.value })} />
            <Input label="Ends on" type="date" value={newSemester.ends_on} onChange={(event) => setNewSemester({ ...newSemester, ends_on: event.target.value })} />
          </div>
          <Button className="mt-4" onClick={createSemester} loading={busy === 'create'}>
            <CalendarPlus className="h-4 w-4" aria-hidden="true" /> Create semester
          </Button>
        </section>

        {/* Import */}
        <section className={sectionClasses} aria-labelledby="import-heading">
          <h2 id="import-heading" className="flex items-center gap-2 text-base font-black text-text-primary">
            <Download className="h-4 w-4 text-primary" aria-hidden="true" /> Import course units
          </h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            Copy course units (with their lecturers) from one semester into another. Students, groups and enrolments are never copied. Units that already exist in the target are skipped.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="import-from" className="block text-sm font-semibold text-text-primary">From</label>
              <select id="import-from" className={cn(fieldClasses, 'mt-1.5')} value={importFrom} onChange={(event) => setImportFrom(event.target.value)}>
                {semesters.map((semester) => <option key={semester.id} value={semester.id}>{semesterLabel(semester)}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="import-to" className="block text-sm font-semibold text-text-primary">Into</label>
              <select id="import-to" className={cn(fieldClasses, 'mt-1.5')} value={importTo} onChange={(event) => setImportTo(event.target.value)}>
                {semesters.map((semester) => <option key={semester.id} value={semester.id}>{semesterLabel(semester)}</option>)}
              </select>
            </div>
          </div>
          <label className="mt-3 flex items-start gap-2.5 text-sm text-text-secondary">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]" checked={importCourseworks} onChange={(event) => setImportCourseworks(event.target.checked)} />
            Also copy each unit&apos;s coursework as unpublished drafts
          </label>
          <Button className="mt-4" variant="secondary" onClick={runImport} loading={busy === 'import'}>
            <Download className="h-4 w-4" aria-hidden="true" /> Import
          </Button>
        </section>
      </div>

      {/* Announcements */}
      <section className={sectionClasses} aria-labelledby="announcements-heading">
        <h2 id="announcements-heading" className="flex items-center gap-2 text-base font-black text-text-primary">
          <Megaphone className="h-4 w-4 text-primary" aria-hidden="true" /> Announcements
        </h2>
        <p className="mt-0.5 text-xs text-text-secondary">Shown at the top of the portal, and on the lock screen while the portal is locked.</p>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <Input label="Title" value={announcement.title} onChange={(event) => setAnnouncement({ ...announcement, title: event.target.value })} placeholder="Semester 2 registration is open" />
            <Textarea label="Message" rows={4} value={announcement.body} onChange={(event) => setAnnouncement({ ...announcement, body: event.target.value })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="announcement-audience" className="block text-sm font-semibold text-text-primary">Who sees it</label>
                <select id="announcement-audience" className={cn(fieldClasses, 'mt-1.5')} value={announcement.audience} onChange={(event) => setAnnouncement({ ...announcement, audience: event.target.value })}>
                  <option value="students">Students</option>
                  <option value="staff">Staff only</option>
                  <option value="everyone">Everyone</option>
                </select>
              </div>
              <div>
                <label htmlFor="announcement-tone" className="block text-sm font-semibold text-text-primary">Style</label>
                <select id="announcement-tone" className={cn(fieldClasses, 'mt-1.5')} value={announcement.tone} onChange={(event) => setAnnouncement({ ...announcement, tone: event.target.value })}>
                  <option value="info">Information</option>
                  <option value="success">Good news</option>
                  <option value="warning">Important</option>
                </select>
              </div>
            </div>
            <Button onClick={postAnnouncement} loading={busy === 'announce'}>
              <Send className="h-4 w-4" aria-hidden="true" /> Post announcement
            </Button>
          </div>
          <div>
            {announcements.length === 0 ? (
              <EmptyState icon={Megaphone} title="No announcements yet" description="Anything you post appears here." />
            ) : (
              <ul className="space-y-2.5">
                {announcements.map((item) => (
                  <li key={item.id} className={cn('rounded-2xl border p-3.5', item.is_active ? 'border-border/80 bg-surface-hover/40' : 'border-dashed border-border/70 opacity-60')}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-text-primary">{item.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary">{item.body}</p>
                        <p className="mt-1.5 text-[11px] text-text-muted">
                          {formatDate(item.created_at)} · {item.audience === 'staff' ? 'Staff' : item.audience === 'everyone' ? 'Everyone' : 'Students'}
                        </p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => toggleAnnouncement(item)} loading={busy === `toggle-${item.id}`}>
                        {item.is_active ? 'Hide' : 'Show'}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Edit semester dialog */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title={editTarget ? `Edit ${semesterLabel(editTarget)}` : ''} size="md">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Name" value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} />
            <Input label="Academic year" value={editForm.academic_year} onChange={(event) => setEditForm({ ...editForm, academic_year: event.target.value })} />
            <div>
              <label htmlFor="edit-term" className="block text-sm font-semibold text-text-primary">Term</label>
              <select id="edit-term" className={cn(fieldClasses, 'mt-1.5')} value={editForm.term_number} onChange={(event) => setEditForm({ ...editForm, term_number: event.target.value })}>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3 (recess)</option>
              </select>
            </div>
            <div className="hidden sm:block" />
            <Input label="Starts on" type="date" value={editForm.starts_on} onChange={(event) => setEditForm({ ...editForm, starts_on: event.target.value })} />
            <Input label="Ends on" type="date" min={editForm.starts_on || undefined} value={editForm.ends_on} onChange={(event) => setEditForm({ ...editForm, ends_on: event.target.value })} />
          </div>
          <p className="text-xs text-text-muted">Changing dates does not start or end the semester. Use Start and End semester for that.</p>
          <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button onClick={saveEdit} loading={busy === 'edit'}>Save changes</Button>
          </div>
        </div>
      </Modal>

      {/* Delete event dialog */}
      <Modal isOpen={!!deleteEvent} onClose={() => setDeleteEvent(null)} title="Remove this event?" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            <strong className="text-text-primary">{deleteEvent?.title}</strong> ({deleteEvent ? eventDateRange(deleteEvent) : ''}) will be removed from the calendar and from reports.
          </p>
          <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setDeleteEvent(null)}>Keep it</Button>
            <Button variant="danger" onClick={confirmDeleteEvent} loading={busy === 'delete-event'}>
              <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove
            </Button>
          </div>
        </div>
      </Modal>

      {/* End semester dialog */}
      <Modal isOpen={!!endTarget} onClose={() => setEndTarget(null)} title={endTarget ? `End ${endTarget.name}?` : ''} size="md">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Its data is kept and stays available in reports. It remains the current semester until you start the next one.
          </p>
          <label className="flex items-start gap-2.5 text-sm font-semibold text-text-primary">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]" checked={endOptions.lock} onChange={(event) => setEndOptions({ ...endOptions, lock: event.target.checked })} />
            Lock the student portal
          </label>
          {endOptions.lock && (
            <div className="pl-6">
              <label htmlFor="end-lock-until" className="block text-xs font-semibold text-text-secondary">Reopen automatically on (leave empty to keep it locked until you open it)</label>
              <input id="end-lock-until" type="datetime-local" className={cn(fieldClasses, 'mt-1.5')} value={endOptions.until} onChange={(event) => setEndOptions({ ...endOptions, until: event.target.value })} />
            </div>
          )}
          <label className="flex items-start gap-2.5 text-sm font-semibold text-text-primary">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]" checked={endOptions.announce} onChange={(event) => setEndOptions({ ...endOptions, announce: event.target.checked })} />
            Tell students with an announcement
          </label>
          <Textarea label="Message to students" rows={4} value={endOptions.message} onChange={(event) => setEndOptions({ ...endOptions, message: event.target.value })} />
          <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setEndTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmEnd} loading={busy === 'end'}>
              <StopCircle className="h-4 w-4" aria-hidden="true" /> End semester
            </Button>
          </div>
        </div>
      </Modal>

      {/* Start semester dialog */}
      <Modal isOpen={!!startTarget} onClose={() => setStartTarget(null)} title={startTarget ? `Start ${startTarget.name}?` : ''} size="md">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            {startTarget && semesterLabel(startTarget)} becomes the current semester for everyone.
            {currentSemester && currentSemester.id !== startTarget?.id ? ` ${currentSemester.name} will be marked as ended.` : ''} Students who were here before will be asked to confirm their details and pick this semester&apos;s course units. New students register as usual.
          </p>
          <label className="flex items-start gap-2.5 text-sm font-semibold text-text-primary">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]" checked={unlockOnStart} onChange={(event) => setUnlockOnStart(event.target.checked)} />
            Open the student portal now
          </label>
          <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setStartTarget(null)}>Cancel</Button>
            <Button variant="success" onClick={confirmStart} loading={busy === 'start'}>
              <PlayCircle className="h-4 w-4" aria-hidden="true" /> Start semester
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
