import type { Semester, SemesterEvent, SemesterEventKind } from '@/types'
import { shortDate } from './format'
import type { ReportColumnSpec } from './types'

export const SEMESTER_EVENT_KINDS: { value: SemesterEventKind; label: string; defaultTitle: string }[] = [
  { value: 'opening', label: 'Semester opens', defaultTitle: 'Semester opens' },
  { value: 'registration', label: 'Registration', defaultTitle: 'Student registration' },
  { value: 'orientation', label: 'Orientation', defaultTitle: 'Orientation week' },
  { value: 'lectures', label: 'Lectures', defaultTitle: 'Lectures begin' },
  { value: 'coursework', label: 'Coursework', defaultTitle: 'Coursework submission' },
  { value: 'tests', label: 'Tests', defaultTitle: 'Mid-semester tests' },
  { value: 'break', label: 'Break', defaultTitle: 'Mid-semester break' },
  { value: 'exams', label: 'Examinations', defaultTitle: 'End of semester examinations' },
  { value: 'results', label: 'Results', defaultTitle: 'Results release' },
  { value: 'closing', label: 'Semester closes', defaultTitle: 'Semester closes' },
  { value: 'holiday', label: 'Public holiday', defaultTitle: 'Public holiday' },
  { value: 'other', label: 'Other', defaultTitle: '' },
]

export function eventKindLabel(kind: string) {
  return SEMESTER_EVENT_KINDS.find((item) => item.value === kind)?.label || 'Other'
}

function dayStart(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00`).getTime()
}

export type EventStatus = 'Completed' | 'In progress' | 'Upcoming'

export function eventStatus(event: Pick<SemesterEvent, 'starts_on' | 'ends_on'>, now = Date.now()): EventStatus {
  const start = dayStart(event.starts_on)
  const end = dayStart(event.ends_on || event.starts_on) + 86_400_000
  if (now >= end) return 'Completed'
  if (now >= start) return 'In progress'
  return 'Upcoming'
}

export function eventDays(event: Pick<SemesterEvent, 'starts_on' | 'ends_on'>) {
  return Math.round((dayStart(event.ends_on || event.starts_on) - dayStart(event.starts_on)) / 86_400_000) + 1
}

export function eventDateRange(event: Pick<SemesterEvent, 'starts_on' | 'ends_on'>) {
  if (!event.ends_on || event.ends_on === event.starts_on) return shortDate(event.starts_on)
  return `${shortDate(event.starts_on)} – ${shortDate(event.ends_on)}`
}

/**
 * The semester's events in date order. The semester's own start and end dates are added
 * as entries when no "opens"/"closes" event covers them, so the calendar is never missing them.
 */
export function calendarRows(semester: Semester | null, events: SemesterEvent[]): SemesterEvent[] {
  const rows = [...events]
  if (semester?.starts_on && !events.some((event) => event.kind === 'opening')) {
    rows.push({ id: 'semester-start', semester_id: semester.id, title: `${semester.name} begins`, kind: 'opening', starts_on: semester.starts_on, ends_on: null, description: 'Semester start date', created_at: '' })
  }
  if (semester?.ends_on && !events.some((event) => event.kind === 'closing')) {
    rows.push({ id: 'semester-end', semester_id: semester.id, title: `${semester.name} ends`, kind: 'closing', starts_on: semester.ends_on, ends_on: null, description: 'Semester end date', created_at: '' })
  }
  return rows.sort((a, b) => a.starts_on.localeCompare(b.starts_on) || (a.ends_on || '').localeCompare(b.ends_on || ''))
}

export const calendarColumns: ReportColumnSpec[] = [
  { key: 'title', header: 'Event', value: (row: SemesterEvent) => row.title },
  { key: 'kind', header: 'Type', value: (row: SemesterEvent) => eventKindLabel(row.kind) },
  { key: 'starts_on', header: 'Starts', value: (row: SemesterEvent) => shortDate(row.starts_on) },
  { key: 'ends_on', header: 'Ends', value: (row: SemesterEvent) => shortDate(row.ends_on || row.starts_on) },
  { key: 'days', header: 'Days', value: (row: SemesterEvent) => eventDays(row), numeric: true },
  { key: 'status', header: 'Status', value: (row: SemesterEvent) => eventStatus(row) },
  { key: 'description', header: 'Notes', value: (row: SemesterEvent) => row.description || '' },
]
