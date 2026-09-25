'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { BookOpen, Building2, GraduationCap, Layers3, ShieldAlert, ShieldCheck, ArrowRight, UserCog } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { motion } from 'framer-motion'

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

  if (authLoading || loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-40 rounded-3xl bg-secondary/20" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-secondary/20" />
          ))}
        </div>
      </div>
    )
  }

  const cards = [
    { label: 'Faculties', value: totals.faculties, icon: Building2, color: 'from-rose-600 to-pink-600' },
    { label: 'Academic Courses', value: totals.courses, icon: BookOpen, color: 'from-indigo-600 to-purple-600' },
    { label: 'Course Units', value: totals.units, icon: Layers3, color: 'from-amber-500 to-orange-600' },
    { label: 'Enrolled Students', value: totals.students, icon: GraduationCap, color: 'from-emerald-500 to-teal-600' },
  ]

  const quickLinks = [
    { label: 'Manage Lecturers', href: '/admin/lecturers', icon: UserCog, highlight: true },
    { label: 'Manage Courses', href: '/coordinator/courses', icon: BookOpen },
    { label: 'Manage Course Units', href: '/coordinator/course-units', icon: Layers3 },
    { label: 'Manage Students', href: '/coordinator/students', icon: GraduationCap },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-rose-500/25 bg-gradient-to-r from-rose-950/20 via-rose-900/10 to-surface/90 p-6 sm:p-8 shadow-xl backdrop-blur-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-48 w-48 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between z-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-[11px] font-bold text-rose-400 backdrop-blur-md mb-2.5">
              <ShieldCheck className="h-3.5 w-3.5 text-rose-400" />
              <span>Super Administrator Control Hub</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-text-primary sm:text-4xl">
              University <span className="bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 bg-clip-text text-transparent">Overview</span>
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-text-secondary font-medium max-w-xl">
              Manage system faculties, lecturer credentials, course unit structures, and global student enrollments.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link href="/admin/lecturers">
              <Button size="sm" className="bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-600 shadow-lg shadow-rose-500/25 border-0">
                <UserCog className="h-4 w-4 mr-1.5" />
                Manage Lecturers
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-danger/30 bg-danger-light/40 p-4 text-xs font-semibold text-danger shadow-xs">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="relative overflow-hidden group">
            <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${color}`} />
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-text-muted">{label}</p>
                  <p className="mt-2 text-3xl sm:text-4xl font-black text-text-primary tracking-tight">{value}</p>
                </div>
                <div className={`rounded-2xl p-3 text-white bg-gradient-to-tr ${color} shadow-md shadow-rose-500/20`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map(({ label, href, icon: Icon, highlight }) => (
          <Link key={href} href={href}>
            <motion.div
              whileHover={{ y: -3, scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className={`flex items-center justify-between rounded-2xl border p-4 shadow-sm backdrop-blur-xl transition-all ${
                highlight
                  ? 'border-rose-500/40 bg-rose-500/10 text-rose-400 hover:border-rose-500/70'
                  : 'border-border/80 bg-surface/90 text-text-primary hover:border-primary/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-5 w-5 ${highlight ? 'text-rose-500' : 'text-primary'}`} />
                <span className="text-xs font-extrabold tracking-tight">{label}</span>
              </div>
              <ArrowRight className="h-4 w-4 opacity-60" />
            </motion.div>
          </Link>
        ))}
      </div>

      {/* Faculty Structure Table Card */}
      <Card>
        <CardHeader className="border-b border-border/60 px-6 py-4">
          <CardTitle>Faculties and Academic Structure</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/60">
            {rows.map((row) => (
              <div key={row.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between hover:bg-surface-hover/50 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-text-primary text-base">{row.name}</span>
                    <Badge variant="secondary">{row.code}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold text-text-secondary">
                  <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-surface/80 px-3 py-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-primary" />
                    <span>{row.courses} courses</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-surface/80 px-3 py-1.5">
                    <Layers3 className="h-3.5 w-3.5 text-amber-500" />
                    <span>{row.units} units</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-surface/80 px-3 py-1.5">
                    <GraduationCap className="h-3.5 w-3.5 text-emerald-500" />
                    <span>{row.students} students</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}