'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { BookOpen, Building2, GraduationCap, Layers3, ShieldAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export function AdminDashboard() {
  const { user, loading: authLoading } = useAuth()
  const supabase = createClient()
  const [rows, setRows] = useState<any[]>([])
  const [totals, setTotals] = useState({ faculties: 0, courses: 0, units: 0, students: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { if (!authLoading && user) loadOverview() }, [authLoading, user])

  async function loadOverview() {
    const [faculties, courses, units, students] = await Promise.all([
      supabase.from('faculties').select('id, code, name').eq('is_active', true).order('name'),
      supabase.from('courses').select('id, faculty_id').eq('is_active', true),
      supabase.from('course_units').select('id, course_id').eq('is_active', true),
      supabase.from('users').select('id, faculty_id, faculty').eq('role', 'student'),
    ])
    const queryError = faculties.error || courses.error || units.error || students.error
    if (queryError) setError(queryError.message)
    const courseRows = courses.data || []
    const unitRows = units.data || []
    const studentRows = students.data || []
    const summaries = (faculties.data || []).map((faculty) => {
      const courseIds = new Set(courseRows.filter((course) => course.faculty_id === faculty.id).map((course) => course.id))
      return { ...faculty, courses: courseIds.size, units: unitRows.filter((unit) => courseIds.has(unit.course_id)).length, students: studentRows.filter((student) => student.faculty_id === faculty.id || student.faculty === faculty.name).length }
    })
    setRows(summaries)
    setTotals({ faculties: summaries.length, courses: courseRows.length, units: unitRows.length, students: studentRows.length })
    setLoading(false)
  }

  if (authLoading || loading) return <div className="animate-pulse space-y-6"><div className="h-10 w-64 rounded bg-secondary/20" /><div className="h-40 rounded-2xl bg-secondary/20" /></div>
  const cards = [['Faculties', totals.faculties, Building2], ['Courses', totals.courses, BookOpen], ['Course units', totals.units, Layers3], ['Students', totals.students, GraduationCap]] as const
  return <div className="space-y-8"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">Administrator workspace</p><h1 className="mt-2 text-3xl font-black text-text-primary">University overview</h1><p className="mt-2 text-sm text-text-secondary">View every faculty and its academic structure from one place.</p></div>{error && <div className="flex gap-3 rounded-2xl border border-danger/30 bg-danger-light/40 p-4 text-sm text-danger"><ShieldAlert className="h-5 w-5" />{error}</div>}<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, Icon]) => <div key={label} className="rounded-2xl border border-border bg-surface p-5 shadow-sm"><Icon className="mb-4 h-5 w-5 text-emerald-600" /><p className="text-xs text-text-muted">{label}</p><p className="mt-1 text-3xl font-black text-text-primary">{value}</p></div>)}</div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[['Manage courses', '/coordinator/courses'], ['Manage course units', '/coordinator/course-units'], ['Manage students', '/coordinator/students']].map(([label, href]) => <Link key={href} href={href} className="rounded-xl border border-border bg-surface px-4 py-3 text-sm font-bold text-text-primary hover:border-emerald-500">{label}</Link>)}</div><section className="rounded-2xl border border-border bg-surface shadow-sm"><div className="border-b border-border px-5 py-4"><h2 className="font-bold text-text-primary">Faculties and academic structure</h2></div><div className="divide-y divide-border">{rows.map((row) => <div key={row.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto_auto_auto]"><div><p className="font-bold text-text-primary">{row.name}</p><p className="text-xs text-text-muted">{row.code}</p></div><span className="text-sm text-text-secondary">{row.courses} courses</span><span className="text-sm text-text-secondary">{row.units} units</span><span className="text-sm text-text-secondary">{row.students} students</span></div>)}</div></section></div>
}