'use client'

import { useEffect, useState } from 'react'
import { Check, Layers3, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function AdminSharedCourseUnits() {
  const supabase = createClient()
  const [units, setUnits] = useState<any[]>([])
  const [faculties, setFaculties] = useState<any[]>([])
  const [selected, setSelected] = useState<Record<string, string[]>>({})
  const [activeUnit, setActiveUnit] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    const [{ data: unitRows }, { data: facultyRows }] = await Promise.all([
      supabase.from('course_units').select('id, code, name, course:courses(code, name, faculty:faculties(id, name))').eq('is_active', true).order('name'),
      supabase.from('faculties').select('id, name, code').eq('is_active', true).order('name'),
    ])
    setUnits(unitRows || [])
    setFaculties(facultyRows || [])
    const { data: assignments } = await supabase.from('course_unit_faculties').select('course_unit_id, faculty_id')
    const next: Record<string, string[]> = {}
    ;(assignments || []).forEach((item) => { next[item.course_unit_id] = [...(next[item.course_unit_id] || []), item.faculty_id] })
    setSelected(next)
  }

  useEffect(() => { load() }, [])

  function toggle(facultyId: string) {
    setSelected((current) => ({ ...current, [activeUnit]: (current[activeUnit] || []).includes(facultyId) ? (current[activeUnit] || []).filter((id) => id !== facultyId) : [...(current[activeUnit] || []), facultyId] }))
  }

  async function save() {
    if (!activeUnit) return
    const { error: deleteError } = await supabase.from('course_unit_faculties').delete().eq('course_unit_id', activeUnit)
    if (deleteError) return setMessage(deleteError.message)
    const rows = (selected[activeUnit] || []).map((faculty_id) => ({ course_unit_id: activeUnit, faculty_id }))
    const { error } = rows.length ? await supabase.from('course_unit_faculties').insert(rows) : { error: null }
    setMessage(error ? error.message : 'Shared faculty assignments saved.')
  }

  return <div className="space-y-6"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">Administrator workspace</p><h1 className="mt-2 text-3xl font-black text-text-primary">Shared course units</h1><p className="mt-2 text-sm text-text-secondary">Courses stay owned by one faculty. Select extra faculties only for course units that are genuinely shared.</p></div><div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]"><div className="space-y-2 rounded-2xl border border-border bg-surface p-3">{units.map((unit) => <button key={unit.id} onClick={() => setActiveUnit(unit.id)} className={`flex w-full items-start gap-3 rounded-xl p-3 text-left ${activeUnit === unit.id ? 'bg-emerald-500/10 ring-1 ring-emerald-500/40' : 'hover:bg-surface-hover'}`}><Layers3 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span><strong className="block text-sm text-text-primary">{unit.code} · {unit.name}</strong><small className="text-xs text-text-muted">Primary: {unit.course?.faculty?.name || 'Course faculty'}</small></span></button>)}</div><div className="rounded-2xl border border-border bg-surface p-5">{activeUnit ? <><div className="mb-4 flex items-center justify-between"><h2 className="font-bold text-text-primary">Available faculties</h2><button onClick={save} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white"><Save className="h-4 w-4" />Save</button></div><div className="space-y-2">{faculties.map((faculty) => <button key={faculty.id} onClick={() => toggle(faculty.id)} className="flex w-full items-center justify-between rounded-xl border border-border px-3 py-3 text-left text-sm"><span><strong className="text-text-primary">{faculty.name}</strong><small className="ml-2 text-xs text-text-muted">{faculty.code}</small></span>{(selected[activeUnit] || []).includes(faculty.id) && <Check className="h-4 w-4 text-emerald-600" />}</button>)}</div>{message && <p className="mt-4 text-sm text-emerald-700">{message}</p>}</> : <p className="text-sm text-text-secondary">Select a course unit to assign its shared faculties.</p>}</div></div></div>
}