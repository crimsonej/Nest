'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ClipboardList, FileSpreadsheet, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { semesterLabel, useSemester } from '@/hooks/useSemester'
import { useSemesterEvents } from '@/hooks/useSemesterEvents'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { EmptyState } from '@/components/ui/EmptyState'
import { calendarColumns, calendarRows, eventDateRange, eventKindLabel, eventStatus } from '@/lib/reports/calendar'
import { escapeHtml, reportFileName, shortDate } from '@/lib/reports/format'
import { calendarPrintHtml, calendarSummary } from '@/lib/reports/lists'
import { openPrintDocument, tableHtml } from '@/lib/reports/print'
import type { ReportColumnSpec, ReportMeta } from '@/lib/reports/types'
import { downloadXlsx } from '@/lib/reports/xlsx'

interface UnitRow { id: string; code: string; name: string; enrolled: number; courseworks: number; groups: number; grouped: number }

const unitColumns: ReportColumnSpec[] = [
  { key: 'code', header: 'Code', value: (row: UnitRow) => row.code, mono: true },
  { key: 'name', header: 'Course unit', value: (row: UnitRow) => row.name },
  { key: 'enrolled', header: 'Enrolled', value: (row: UnitRow) => row.enrolled, numeric: true },
  { key: 'courseworks', header: 'Coursework', value: (row: UnitRow) => row.courseworks, numeric: true },
  { key: 'groups', header: 'Groups', value: (row: UnitRow) => row.groups, numeric: true },
  { key: 'grouped', header: 'In groups', value: (row: UnitRow) => row.grouped, numeric: true },
  { key: 'pct', header: 'Grouped %', value: (row: UnitRow) => (row.enrolled ? Math.round((row.grouped / row.enrolled) * 100) : 0), numeric: true },
]

const statusTone: Record<string, string> = {
  Completed: 'bg-surface-hover text-text-secondary',
  'In progress': 'bg-success/10 text-success',
  Upcoming: 'bg-warning/10 text-warning',
}

/** Summary of the semester currently being viewed (switch semesters from the top bar). */
export function SemesterReport() {
  const supabase = useMemo(() => createClient(), [])
  const toast = useToast()
  const { viewingSemester } = useSemester()
  const { events: rawEvents } = useSemesterEvents(viewingSemester?.id)
  const events = useMemo(() => calendarRows(viewingSemester, rawEvents), [viewingSemester, rawEvents])
  const [rows, setRows] = useState<UnitRow[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [units, enrolments, courseworks, groups, members] = await Promise.all([
        supabase.from('course_units').select('id, code, name').order('code'),
        supabase.from('student_course_units').select('course_unit_id'),
        supabase.from('courseworks').select('id, course_unit_id'),
        supabase.from('groups').select('id, coursework_id'),
        supabase.from('group_members').select('group_id, user_id'),
      ])
      const failed = [units, enrolments, courseworks, groups, members].find((res) => res.error)
      if (failed?.error) { setError(failed.error.message); setLoading(false); return }
      const cwUnit = new Map((courseworks.data || []).map((cw) => [cw.id, cw.course_unit_id]))
      const groupUnit = new Map((groups.data || []).map((g) => [g.id, cwUnit.get(g.coursework_id)]))
      setRows((units.data || []).map((unit) => ({
        id: unit.id, code: unit.code, name: unit.name,
        enrolled: (enrolments.data || []).filter((e) => e.course_unit_id === unit.id).length,
        courseworks: (courseworks.data || []).filter((cw) => cw.course_unit_id === unit.id).length,
        groups: (groups.data || []).filter((g) => cwUnit.get(g.coursework_id) === unit.id).length,
        grouped: new Set((members.data || []).filter((m) => groupUnit.get(m.group_id) === unit.id).map((m) => m.user_id)).size,
      })))
      setLoading(false)
    }
    void load()
  }, [supabase])

  const totals = rows.reduce((t, r) => ({ enrolled: t.enrolled + r.enrolled, courseworks: t.courseworks + r.courseworks, groups: t.groups + r.groups, grouped: t.grouped + r.grouped }), { enrolled: 0, courseworks: 0, groups: 0, grouped: 0 })
  const summary = [
    { label: 'Course units', value: rows.length },
    { label: 'Enrolments', value: totals.enrolled },
    { label: 'Coursework', value: totals.courseworks },
    { label: 'Groups', value: totals.groups },
    { label: 'Students in groups', value: totals.grouped },
  ]

  const meta = (): ReportMeta => ({
    title: 'Semester report',
    subtitle: viewingSemester ? `${viewingSemester.name}, academic year ${viewingSemester.academic_year}` : undefined,
    semester: viewingSemester ? semesterLabel(viewingSemester) : undefined,
    facts: viewingSemester?.starts_on || viewingSemester?.ends_on
      ? [['Semester dates', `${shortDate(viewingSemester?.starts_on) || 'not set'} – ${shortDate(viewingSemester?.ends_on) || 'not set'}`]]
      : [],
  })

  const exportPdf = () => {
    const opened = openPrintDocument({
      meta: meta(),
      orientation: 'portrait',
      summary,
      bodyHtml: `
        <h2 class="section">Semester calendar<small>${events.length} event(s)</small></h2>
        ${calendarPrintHtml(events)}
        <h2 class="section">Course units<small>${rows.length} unit(s)</small></h2>
        ${tableHtml(unitColumns, rows, { numbered: true })}
        <table class="data" style="margin-top:-1px"><tbody><tr><td><b>Totals</b></td><td class="num"><b>${escapeHtml(totals.enrolled)}</b> enrolled</td><td class="num"><b>${escapeHtml(totals.courseworks)}</b> coursework</td><td class="num"><b>${escapeHtml(totals.groups)}</b> groups</td><td class="num"><b>${escapeHtml(totals.grouped)}</b> in groups</td></tr></tbody></table>`,
      signatures: ['Academic Registrar', 'Dean of Faculty', 'Head of Department'],
    })
    if (!opened) toast.error('Your browser blocked the report window. Allow pop-ups for this site and try again.')
  }

  const exportXlsx = async () => {
    setExporting(true)
    try {
      await downloadXlsx(
        reportFileName(['nest', 'semester-report', viewingSemester ? `${viewingSemester.name} ${viewingSemester.academic_year}` : null], 'xlsx'),
        meta(),
        [
          { name: 'Course units', columns: unitColumns, sections: [{ rows }], summary },
          { name: 'Calendar', columns: calendarColumns, sections: [{ rows: events }], summary: calendarSummary(events), wrapKeys: ['description'] },
        ]
      )
    } catch (exportError) {
      console.error('Semester report export failed:', exportError)
      toast.error('Could not build the Excel file. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-3xl border border-border/80 bg-gradient-to-br from-primary-light via-surface to-surface p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between sm:p-7">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-primary"><ClipboardList className="h-4 w-4" aria-hidden="true" /> Semester report</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">{semesterLabel(viewingSemester)}</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {viewingSemester?.starts_on || viewingSemester?.ends_on
              ? `${shortDate(viewingSemester?.starts_on) || 'Start not set'} – ${shortDate(viewingSemester?.ends_on) || 'end not set'}. `
              : ''}
            Use the semester selector in the top bar to report on another semester.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void exportXlsx()} loading={exporting} disabled={loading}><FileSpreadsheet className="h-4 w-4" aria-hidden="true" /> Excel</Button>
          <Button onClick={exportPdf} disabled={loading}><FileText className="h-4 w-4" aria-hidden="true" /> PDF</Button>
        </div>
      </section>
      {error && <ErrorBanner message={error} />}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {summary.map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-border/80 bg-surface p-4 shadow-xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">{label}</p>
            <p className="mt-1 text-2xl font-black text-text-primary">{loading ? '…' : value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-3xl border border-border/80 bg-surface p-5 shadow-sm sm:p-6" aria-labelledby="report-calendar-heading">
        <h2 id="report-calendar-heading" className="flex items-center gap-2 text-base font-black text-text-primary">
          <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" /> Semester calendar
        </h2>
        {events.length === 0 ? (
          <div className="mt-3"><EmptyState icon={CalendarDays} title="No calendar events yet" description="Admins and coordinators can add opening, orientation, exam and other dates on the Semesters page." /></div>
        ) : (
          <ol className="mt-4 divide-y divide-border/60">
            {events.map((item) => {
              const status = eventStatus(item)
              return (
                <li key={item.id} className="grid gap-1 py-3 sm:grid-cols-[13rem_1fr_auto] sm:items-center sm:gap-4">
                  <span className="text-xs font-bold text-primary">{eventDateRange(item)}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-text-primary">{item.title}</span>
                    <span className="block text-xs text-text-muted">{eventKindLabel(item.kind)}{item.description ? ` · ${item.description}` : ''}</span>
                  </span>
                  <span className={cn('w-fit rounded-full px-2.5 py-0.5 text-[11px] font-bold', statusTone[status])}>{status}</span>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      <div className="overflow-x-auto rounded-3xl border border-border/80 bg-surface shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-hover/60 text-[11px] uppercase tracking-wider text-text-muted">
            <tr><th className="px-4 py-3">Unit</th><th className="px-4 py-3 text-right">Enrolled</th><th className="px-4 py-3 text-right">Coursework</th><th className="px-4 py-3 text-right">Groups</th><th className="px-4 py-3 text-right">In groups</th><th className="px-4 py-3 text-right">Grouped %</th></tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3"><span className="font-black text-primary">{r.code}</span> <span className="text-text-primary">{r.name}</span></td>
                <td className="px-4 py-3 text-right">{r.enrolled}</td>
                <td className="px-4 py-3 text-right">{r.courseworks}</td>
                <td className="px-4 py-3 text-right">{r.groups}</td>
                <td className="px-4 py-3 text-right">{r.grouped}</td>
                <td className="px-4 py-3 text-right">{r.enrolled ? Math.round((r.grouped / r.enrolled) * 100) : 0}%</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-text-secondary">No course units in this semester yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
