'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { readScreenCache, screenKey, writeScreenCache } from '@/lib/screen-cache'
import { BookOpen, Building2, GraduationCap, Layers3, ShieldCheck, ArrowRight, UserCog } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { ErrorBanner } from '../ui/ErrorBanner'
import { EmptyState } from '../ui/EmptyState'
import { MetricCard } from '../ui/MetricCard'
import { motion } from 'framer-motion'
import { useReducedMotion, applyMotionPreference } from '@/lib/animation'

export function AdminDashboard() {
  const { user, loading: authLoading } = useAuth()
  const supabase = createClient()
  const [rows, setRows] = useState<any[]>([])
  const [totals, setTotals] = useState({ faculties: 0, courses: 0, units: 0, students: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const reducedMotion = useReducedMotion()

  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setLoading(false)
      return
    }
    // Show the last overview straight away, then refresh it.
    const cached = readScreenCache<{ rows: any[]; totals: typeof totals }>(screenKey('admin-dashboard', user.id))
    if (cached) {
      setRows(cached.rows)
      setTotals(cached.totals)
      setLoading(false)
    }
    loadOverview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id])

  async function loadOverview() {
    setError('')
    try {
      const [faculties, courses, units, students] = await Promise.all([
        supabase.from('faculties').select('id, code, name').eq('is_active', true).order('name'),
        supabase.from('courses').select('id, faculty_id').eq('is_active', true),
        supabase.from('course_units').select('id, course_id').eq('is_active', true),
        supabase.from('users').select('id, faculty_id, faculty').eq('role', 'student'),
      ])
      const queryError = faculties.error || courses.error || units.error || students.error
      if (queryError) throw queryError
      const courseRows = courses.data || []
      const unitRows = units.data || []
      const studentRows = students.data || []
      const summaries = (faculties.data || []).map((faculty) => {
        const courseIds = new Set(courseRows.filter((course) => course.faculty_id === faculty.id).map((course) => course.id))
        return { ...faculty, courses: courseIds.size, units: unitRows.filter((unit) => courseIds.has(unit.course_id)).length, students: studentRows.filter((student) => student.faculty_id === faculty.id || student.faculty === faculty.name).length }
      })
      const nextTotals = { faculties: summaries.length, courses: courseRows.length, units: unitRows.length, students: studentRows.length }
      setRows(summaries)
      setTotals(nextTotals)
      if (user?.id) writeScreenCache(screenKey('admin-dashboard', user.id), { rows: summaries, totals: nextTotals })
    } catch (err) {
      console.error('Error loading admin overview:', err)
      setError('We couldn’t load the university overview. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  async function retry() {
    setRetrying(true)
    await loadOverview()
    setRetrying(false)
  }

  if (authLoading || loading) {
    return (
      <div className="animate-pulse space-y-6" role="status" aria-label="Loading university overview">
        <div className="h-40 rounded-3xl bg-border/30" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-border/25" />
          ))}
        </div>
        <div className="h-64 rounded-2xl bg-border/20" />
      </div>
    )
  }

  const cards = [
    { title: 'Faculties', value: totals.faculties, icon: <Building2 className="h-6 w-6" />, color: 'secondary' as const },
    { title: 'Academic Courses', value: totals.courses, icon: <BookOpen className="h-6 w-6" />, color: 'primary' as const },
    { title: 'Course Units', value: totals.units, icon: <Layers3 className="h-6 w-6" />, color: 'warning' as const },
    { title: 'Enrolled Students', value: totals.students, icon: <GraduationCap className="h-6 w-6" />, color: 'success' as const },
  ]

  const quickLinks = [
    { label: 'Manage Lecturers', href: '/admin/lecturers', icon: UserCog, highlight: true },
    { label: 'Manage Courses', href: '/admin/courses', icon: BookOpen },
    { label: 'Manage Course Units', href: '/admin/course-units', icon: Layers3 },
    { label: 'Manage Students', href: '/admin/students', icon: GraduationCap },
  ]

  return (
    <motion.div
      initial={applyMotionPreference(reducedMotion, { opacity: 0, y: 15 }, {})}
      animate={applyMotionPreference(reducedMotion, { opacity: 1, y: 0 }, {})}
      transition={applyMotionPreference(reducedMotion, { duration: 0.4 }, {})}
      className="space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-primary-light via-surface to-surface p-6 sm:p-8 shadow-xl backdrop-blur-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-48 w-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between z-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary backdrop-blur-md mb-2.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span>Super Administrator Control Hub</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-text-primary sm:text-4xl">
              University <span className="text-primary">Overview</span>
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-text-secondary font-medium max-w-xl">
              Manage system faculties, lecturer credentials, course unit structures, and global student enrollments.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link
              href="/admin/lecturers"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-primary/25 transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <UserCog className="h-4 w-4" aria-hidden="true" />
              Manage Lecturers
            </Link>
          </div>
        </div>
      </div>

      {error && <ErrorBanner title="Overview unavailable" message={error} onRetry={retry} retrying={retrying} />}

      {/* Metric Cards Grid */}
      <motion.div
        variants={applyMotionPreference(reducedMotion, { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }, { hidden: {}, visible: { transition: { staggerChildren: 0 } } })}
        initial="hidden"
        animate="visible"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {cards.map((card) => (
          <motion.div key={card.title} variants={applyMotionPreference(reducedMotion, { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.25 } } }, { hidden: { opacity: 0 }, visible: { opacity: 1, y: 0 } })}>
            <MetricCard {...card} />
          </motion.div>
        ))}
      </motion.div>

      {/* Quick Navigation Cards */}
      <motion.div
        variants={applyMotionPreference(reducedMotion, { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }, { hidden: {}, visible: { transition: { staggerChildren: 0 } } })}
        initial="hidden"
        animate="visible"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        {quickLinks.map(({ label, href, icon: Icon, highlight }) => (
          <motion.div key={href} variants={applyMotionPreference(reducedMotion, { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.22 } } }, { hidden: { opacity: 0 }, visible: { opacity: 1, y: 0 } })}>
          <Link href={href} className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background">
            <motion.div
              whileHover={applyMotionPreference(reducedMotion, { y: -3, scale: 1.01 }, {})}
              transition={applyMotionPreference(reducedMotion, { type: 'spring', stiffness: 350, damping: 25 }, {})}
              className={`flex items-center justify-between rounded-2xl border p-4 shadow-sm backdrop-blur-xl transition-all ${
                highlight
                  ? 'border-primary/40 bg-primary/10 text-primary hover:border-primary/70'
                  : 'border-border/80 bg-surface/90 text-text-primary hover:border-primary/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-5 w-5 ${highlight ? 'text-primary' : 'text-primary'}`} aria-hidden="true" />
                <span className="text-xs font-extrabold tracking-tight">{label}</span>
              </div>
              <ArrowRight className="h-4 w-4 opacity-60" aria-hidden="true" />
            </motion.div>
          </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* Faculty Structure Table Card */}
      <Card>
        <CardHeader className="border-b border-border/60 px-6 py-4">
          <CardTitle>Faculties and Academic Structure</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 && !error ? (
            <EmptyState
              icon={Building2}
              title="No faculties yet"
              description="Add a faculty to start building courses and course units."
              action={{ label: 'Add a faculty', href: '/admin/faculties' }}
            />
          ) : (
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
                    <BookOpen className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    <span>{row.courses} courses</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-surface/80 px-3 py-1.5">
                    <Layers3 className="h-3.5 w-3.5 text-warning" aria-hidden="true" />
                    <span>{row.units} units</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-surface/80 px-3 py-1.5">
                    <GraduationCap className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                    <span>{row.students} students</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}