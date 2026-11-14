'use client'

import { useEffect, useMemo, useState } from 'react'
import { ClipboardList, Printer } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { semesterLabel, useSemester } from '@/hooks/useSemester'
import { Button } from '@/components/ui/Button'
import { ErrorBanner } from '@/components/ui/ErrorBanner'

interface UnitRow { id: string; code: string; name: string; enrolled: number; courseworks: number; groups: number; grouped: number }

/** Printable summary of the semester currently being viewed (switch semesters from the top bar). */
export function SemesterReport() {
  const supabase = useMemo(() => createClient(), [])
  const { viewingSemester } = useSemester()
  const [rows, setRows] = useState<UnitRow[]>([])
  const [loading, setLoading] = useState(true)
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

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-3xl border border-border/80 bg-gradient-to-br from-primary-light via-surface to-surface p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between sm:p-7">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-primary"><ClipboardList className="h-4 w-4" aria-hidden="true" /> Semester report</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">{semesterLabel(viewingSemester)}</h1>
          <p className="mt-1 text-sm text-text-secondary">Use the semester selector in the top bar to report on another semester.</p>
        </div>
        <Button variant="secondary" onClick={() => window.print()} className="print:hidden"><Printer className="h-4 w-4" aria-hidden="true" /> Print / save PDF</Button>
      </section>
      {error && <ErrorBanner message={error} />}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[['Course units', rows.length], ['Enrolments', totals.enrolled], ['Coursework', totals.courseworks], ['Groups', totals.groups], ['Students in groups', totals.grouped]].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-border/80 bg-surface p-4 shadow-xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">{label}</p>
            <p className="mt-1 text-2xl font-black text-text-primary">{loading ? '…' : value}</p>
          </div>
        ))}
      </div>
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
