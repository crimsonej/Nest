'use client'

import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Users, BookOpen, Target, ArrowRight, Plus, Check, Clock, AlertTriangle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getStudentCourseUnitIds } from '@/lib/faculty-access'
import { reportStudentQuery } from '@/lib/student-query-diagnostics'

interface MetricCardProps {
  title: string
  value: string | number
  change?: string
  changeType?: 'increase' | 'decrease' | 'neutral'
  icon: React.ReactNode
  color: 'primary' | 'success' | 'warning' | 'danger'
  onClick?: () => void
}

function MetricCard({ title, value, change, changeType = 'neutral', icon, color, onClick }: MetricCardProps) {
  const colorClasses = {
    primary: 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/30',
    success: 'bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30',
    warning: 'bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/30',
    danger: 'bg-gradient-to-tr from-rose-600 to-red-600 text-white shadow-md shadow-rose-500/30',
  }

  return (
    <Card hover={Boolean(onClick)} onClick={onClick} className="group">
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-80 group-hover:opacity-100 transition-opacity" />
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-text-muted">{title}</p>
            <p className="mt-2 text-3xl sm:text-4xl font-black text-text-primary tracking-tight">{value}</p>
            {change && (
              <p
                className={cn('mt-1.5 text-xs font-semibold', {
                  'text-emerald-500': changeType === 'increase',
                  'text-rose-500': changeType === 'decrease',
                  'text-text-muted': changeType === 'neutral',
                })}
              >
                {change}
              </p>
            )}
          </div>
          <div className={cn('rounded-2xl p-3 shrink-0', colorClasses[color])}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

/* ────────────────────────────────────────
   Flip-Clock Digit Card
   Airport departure board style animation
   ──────────────────────────────────────── */

function FlipDigit({ value, prevValue, flipKey }: { value: string; prevValue: string; flipKey: number }) {
  const isFlipping = value !== prevValue

  return (
    <div className="flip-clock-card relative" style={{ width: 38, height: 52 }}>
      {/* ── Static layers (always visible, clipped to top/bottom half) ── */}
      {/* Top half - current value */}
      <div
        className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-t-xl bg-gradient-to-b from-surface to-surface-hover/80"
        style={{ clipPath: 'inset(0 0 50% 0)' }}
      >
        <span className="text-[26px] font-black tracking-tight text-text-primary select-none">{value}</span>
      </div>
      {/* Bottom half - current value */}
      <div
        className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-b-xl bg-gradient-to-t from-surface to-surface-hover/60"
        style={{ clipPath: 'inset(50% 0 0 0)' }}
      >
        <span className="text-[26px] font-black tracking-tight text-text-primary select-none">{value}</span>
      </div>

      {/* ── Flip animation layers (only while flipping) ── */}
      {isFlipping && (
        <>
          {/* Top flap - old value flipping down */}
          <div
            key={`top-${flipKey}`}
            className="flip-top-old absolute inset-0 flex items-center justify-center overflow-hidden rounded-t-xl bg-gradient-to-b from-surface to-surface-hover/80"
            style={{ clipPath: 'inset(0 0 50% 0)', zIndex: 10 }}
          >
            <span className="text-[26px] font-black tracking-tight text-text-primary select-none">{prevValue}</span>
          </div>
          {/* Bottom flap - new value flipping up */}
          <div
            key={`bot-${flipKey}`}
            className="flip-bottom-new absolute inset-0 flex items-center justify-center overflow-hidden rounded-b-xl bg-gradient-to-t from-surface to-surface-hover/60"
            style={{ clipPath: 'inset(50% 0 0 0)', zIndex: 10 }}
          >
            <span className="text-[26px] font-black tracking-tight text-text-primary select-none">{value}</span>
          </div>
          {/* Glow flash */}
          <div
            className="flip-glow absolute inset-0 rounded-xl opacity-0 pointer-events-none"
            style={{
              zIndex: 15,
              background: 'radial-gradient(ellipse at center, color-mix(in srgb, var(--color-primary) 25%, transparent), transparent 70%)',
            }}
          />
        </>
      )}

      {/* Center divider line */}
      <div
        className="absolute inset-x-0 pointer-events-none"
        style={{ top: '50%', height: 1, background: 'color-mix(in srgb, var(--color-border) 60%, transparent)', zIndex: 20, transform: 'translateY(-0.5px)' }}
      />
    </div>
  )
}

function FlipClockGroup({ value, label }: { value: number; label: string }) {
  const [displayValue, setDisplayValue] = useState(String(value).padStart(2, '0'))
  const prevValueRef = useRef(displayValue)
  const flipKeyRef = useRef(0)

  useEffect(() => {
    const newVal = String(value).padStart(2, '0')
    if (newVal !== displayValue) {
      prevValueRef.current = displayValue
      flipKeyRef.current += 1
      setDisplayValue(newVal)
    }
  }, [value, displayValue])

  const digits = displayValue.split('')
  const prevDigits = prevValueRef.current.split('')

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-center gap-[3px]">
        {digits.map((digit, i) => (
          <FlipDigit
            key={i}
            value={digit}
            prevValue={prevDigits[i] || digit}
            flipKey={flipKeyRef.current}
          />
        ))}
      </div>
      <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-text-muted">
        {label}
      </span>
    </div>
  )
}

function FlipClockSeparator() {
  return (
    <div className="flex flex-col items-center gap-1.5 pb-4">
      <motion.div
        animate={{ opacity: [1, 0.2, 1] }}
        transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
        className="flex flex-col gap-1.5"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-glow-primary" />
        <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-glow-primary" />
      </motion.div>
    </div>
  )
}

function CountdownWidget({ lockAt, title }: { lockAt: string; title: string }) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null)

  useEffect(() => {
    function calculate() {
      const diff = new Date(lockAt).getTime() - Date.now()
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        return
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
      const minutes = Math.floor((diff / 1000 / 60) % 60)
      const seconds = Math.floor((diff / 1000) % 60)
      setTimeLeft({ days, hours, minutes, seconds })
    }

    calculate()
    const timer = setInterval(calculate, 1000)
    return () => clearInterval(timer)
  }, [lockAt])

  if (!timeLeft) return null

  const isExpired = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0
  const totalSecondsLeft = timeLeft.days * 86400 + timeLeft.hours * 3600 + timeLeft.minutes * 60 + timeLeft.seconds
  const isUrgent = totalSecondsLeft > 0 && totalSecondsLeft < 3600 // less than 1 hour
  const isWarning = totalSecondsLeft > 0 && totalSecondsLeft < 86400 // less than 1 day

  const urgencyBorder = isExpired
    ? 'border-danger/40'
    : isUrgent
    ? 'border-rose-500/40'
    : isWarning
    ? 'border-amber-500/30'
    : 'border-primary/30'

  const urgencyGlow = isExpired
    ? 'shadow-glow-rose'
    : isUrgent
    ? 'shadow-glow-rose'
    : isWarning
    ? ''
    : ''

  return (
    <Card className={cn('relative overflow-hidden bg-surface/90 shadow-xl backdrop-blur-xl', urgencyBorder, urgencyGlow)}>
      {/* Ambient background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isUrgent
            ? 'radial-gradient(circle at 80% 20%, rgba(225,29,72,0.12), transparent 50%)'
            : isWarning
            ? 'radial-gradient(circle at 80% 20%, rgba(245,158,11,0.10), transparent 50%)'
            : 'radial-gradient(circle at 80% 20%, rgba(79,70,229,0.10), transparent 50%)',
        }}
      />

      <CardContent className="relative p-5 sm:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          {/* Info section */}
          <div className="max-w-xl">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className={cn(
                  'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                  isExpired ? 'bg-danger' : isUrgent ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-primary'
                )} />
                <span className={cn(
                  'relative inline-flex rounded-full h-2.5 w-2.5',
                  isExpired ? 'bg-danger' : isUrgent ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-primary'
                )} />
              </span>
              <p className={cn(
                'text-[11px] font-extrabold uppercase tracking-[0.2em]',
                isExpired ? 'text-danger' : isUrgent ? 'text-rose-500' : isWarning ? 'text-amber-500' : 'text-primary'
              )}>
                {isExpired ? 'Deadline Expired' : isUrgent ? 'Urgent — Due Soon' : 'Next Deadline'}
              </p>
            </div>
            <h3 className="mt-2 text-xl font-extrabold tracking-tight text-text-primary sm:text-2xl">{title}</h3>
            <div className="flex items-center gap-2 mt-1.5">
              <Clock className="h-3.5 w-3.5 text-text-muted" />
              <p className="text-xs font-medium text-text-muted">
                Due {new Date(lockAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
            {isUrgent && !isExpired && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-[10px] font-bold text-rose-500"
              >
                <AlertTriangle className="h-3 w-3" />
                Less than 1 hour remaining
              </motion.div>
            )}
          </div>

          {/* Countdown clock */}
          {isExpired ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-flex items-center self-start gap-2 rounded-2xl border border-danger/20 bg-danger-light px-5 py-3 text-sm font-bold text-danger"
            >
              <AlertTriangle className="h-4 w-4" />
              Deadline Expired
            </motion.div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <FlipClockGroup value={timeLeft.days} label="Days" />
              <FlipClockSeparator />
              <FlipClockGroup value={timeLeft.hours} label="Hours" />
              <FlipClockSeparator />
              <FlipClockGroup value={timeLeft.minutes} label="Min" />
              <FlipClockSeparator />
              <FlipClockGroup value={timeLeft.seconds} label="Sec" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/* ────────────────────────────────────────
   Loading Skeleton
   ──────────────────────────────────────── */

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="rounded-3xl border border-border/40 bg-surface/60 p-6 sm:p-8">
        <div className="h-3 bg-border/30 rounded-full w-48 mb-4" />
        <div className="h-8 bg-border/30 rounded-xl w-72 mb-2" />
        <div className="h-4 bg-border/20 rounded-lg w-96 max-w-full" />
      </div>

      {/* Countdown skeleton */}
      <div className="rounded-3xl border border-border/40 bg-surface/60 p-6">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
          <div className="space-y-2">
            <div className="h-3 bg-border/30 rounded-full w-24" />
            <div className="h-6 bg-border/30 rounded-xl w-64" />
            <div className="h-3 bg-border/20 rounded-lg w-40" />
          </div>
          <div className="flex gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-[38px] h-[52px] sm:w-[52px] sm:h-[68px] rounded-xl bg-border/20" />
                  <div className="w-[38px] h-[52px] sm:w-[52px] sm:h-[68px] rounded-xl bg-border/20" />
                </div>
                <div className="h-2 w-8 bg-border/20 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Metrics skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-3xl border border-border/40 bg-surface/60 p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <div className="h-3 bg-border/30 rounded-full w-32" />
                <div className="h-9 bg-border/30 rounded-xl w-16" />
              </div>
              <div className="h-12 w-12 rounded-2xl bg-border/20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ────────────────────────────────────────
   Main Dashboard
   ──────────────────────────────────────── */

export function StudentDashboard() {
  const { user } = useAuth()
  const supabase = createClient()
  const [metrics, setMetrics] = useState({
    myGroups: 0,
    registeredCourseUnits: 0,
    activeTasks: 0,
  })
  const [loading, setLoading] = useState(true)
  const [dataError, setDataError] = useState('')
  const [recentGroups, setRecentGroups] = useState<any[]>([])
  const [recentTasks, setRecentTasks] = useState<any[]>([])
  const [nearestCoursework, setNearestCoursework] = useState<any>(null)
  const [allCourseUnits, setAllCourseUnits] = useState<any[]>([])
  const [myCourseUnitIds, setMyCourseUnitIds] = useState<string[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [dataVersion, setDataVersion] = useState(0)
  const [selectedGroup, setSelectedGroup] = useState<any>(null)
  const [groupModalOpen, setGroupModalOpen] = useState(false)

  useEffect(() => {
    async function fetchData() {
      if (!user) return

      try {
        const allowedCourseUnitIds = await getStudentCourseUnitIds(supabase, user)
        const courseUnitFilter = allowedCourseUnitIds.length
          ? allowedCourseUnitIds
          : ['00000000-0000-0000-0000-000000000000']
        const [groupsRes, tasksRes, enrollmentsRes, cwRes, allUnitsRes] = await Promise.all([
          supabase
            .from('group_members')
            .select(`group:groups!inner(
              id, name, status, description, max_members,
              leader:users!groups_leader_id_fkey(id, full_name, email, whatsapp_phone),
              member_count:group_members(count),
              coursework:courseworks(title, course_unit_id, course_unit:course_units(code, name))
            )`)
            .eq('user_id', user.id)
            .in('groups.status', ['forming', 'active']),
          supabase
            .from('tasks')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10),
          supabase
            .from('student_course_units')
            .select('course_unit_id')
            .eq('user_id', user.id)
            .eq('status', 'active'),
          supabase
            .from('courseworks')
            .select('*, course_unit:course_units(name, code)')
            .eq('is_published', true)
            .in('course_unit_id', courseUnitFilter)
            .order('lock_at', { ascending: true }),
          supabase.from('course_units').select('*').eq('is_active', true).in('id', courseUnitFilter),

        ])

        reportStudentQuery('student group memberships', { user_id: 'authenticated profile id', group_status: 'forming or active' }, groupsRes.data, groupsRes.error)
        reportStudentQuery('student tasks', { user_id: 'authenticated profile id', order: 'created_at desc', limit: 10 }, tasksRes.data, tasksRes.error)
        reportStudentQuery('student enrollments', { user_id: 'authenticated profile id', status: 'active' }, enrollmentsRes.data, enrollmentsRes.error)
        reportStudentQuery('published coursework', { is_published: true, course_unit_id_count: allowedCourseUnitIds.length }, cwRes.data, cwRes.error)
        reportStudentQuery('active course units', { is_active: true, id_filter_count: allowedCourseUnitIds.length }, allUnitsRes.data, allUnitsRes.error)
        const queryError = groupsRes.error || tasksRes.error || enrollmentsRes.error || cwRes.error || allUnitsRes.error
        if (queryError) throw queryError

        const allowedIds = new Set(allowedCourseUnitIds)
        const groups = (groupsRes.data || []).filter((row: any) => allowedIds.has(row.group?.coursework?.course_unit_id))
        reportStudentQuery('student groups after faculty course-unit filter', {
          membership_row_count: (groupsRes.data || []).length,
          allowed_course_unit_count: allowedCourseUnitIds.length,
        }, groups, null)
        const tasks = tasksRes.data || []
        const enrolledIds = Array.from(new Set((enrollmentsRes.data || [])
          .map((e: any) => e.course_unit_id)
          .filter((id: string) => id && allowedIds.has(id))))
        reportStudentQuery('enrollments after faculty course-unit filter', {
          active_enrollment_row_count: (enrollmentsRes.data || []).length,
          allowed_course_unit_count: allowedCourseUnitIds.length,
        }, enrolledIds, null)

        // Show all faculty-accessible coursework for the countdown,
        // not just enrolled ones (so new students still see deadlines)
        const allCourseworks = cwRes.data || []
        const enrolledCourseworks = allCourseworks.filter((coursework: any) => {
          if (!coursework.course_unit_id) return true
          return enrolledIds.includes(coursework.course_unit_id)
        })
        // Use enrolled coursework if any, otherwise fall back to all accessible
        const relevantCourseworks = enrolledCourseworks.length > 0 ? enrolledCourseworks : allCourseworks

        reportStudentQuery('coursework for countdown', {
          published_coursework_count: allCourseworks.length,
          enrolled_filtered_count: enrolledCourseworks.length,
          using_all_fallback: enrolledCourseworks.length === 0,
        }, relevantCourseworks, null)
        reportStudentQuery('active task metric', { task_count: tasks.length, status: 'active' }, tasks.filter((task: { status: string }) => task.status !== 'completed' && task.status !== 'submitted'), null)

        setMetrics({
          myGroups: groups.length,
          registeredCourseUnits: enrolledIds.length,
          activeTasks: tasks.filter((t: { status: string }) => t.status !== 'completed' && t.status !== 'submitted').length,
        })

        setRecentGroups(groups.slice(0, 5))
        setRecentTasks(tasks.slice(0, 5))
        setAllCourseUnits(allUnitsRes.data || [])
        setMyCourseUnitIds(enrolledIds)

        const activeCw = relevantCourseworks.find((coursework: any) => coursework.lock_at && new Date(coursework.lock_at) > new Date())
        setNearestCoursework(activeCw || relevantCourseworks[0] || null)
      } catch (error) {
        console.error('[student-data][temporary] Dashboard load failed', {
          errorName: error instanceof Error ? error.name : 'unknown',
        })
        setDataError('Unable to load dashboard data. Check the browser console diagnostics and try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, dataVersion])

  async function toggleCourseUnitEnrollment(unitId: string) {
    if (!user) return
    const isEnrolled = myCourseUnitIds.includes(unitId)

    try {
      if (isEnrolled) {
        await supabase.from('student_course_units').delete().eq('user_id', user.id).eq('course_unit_id', unitId)
        setMyCourseUnitIds((prev) => prev.filter((id) => id !== unitId))
      } else {
        await supabase.from('student_course_units').insert({ user_id: user.id, course_unit_id: unitId, status: 'active' })
        setMyCourseUnitIds((prev) => [...prev, unitId])
      }
      setDataVersion((v) => v + 1)
    } catch (err) {
      console.error('Failed to toggle course unit enrollment:', err)
    }
  }

  if (loading) {
    return <DashboardSkeleton />
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {dataError && (
        <div className="rounded-2xl border border-danger/20 bg-danger-light p-4 text-xs font-semibold text-danger" role="alert">
          Unable to load live dashboard data: {dataError}
        </div>
      )}

      {/* Header Banner */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-3xl border border-indigo-500/25 bg-gradient-to-r from-indigo-950/20 via-violet-900/10 to-surface/90 p-6 sm:p-8 shadow-xl backdrop-blur-2xl"
      >
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between z-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[11px] font-bold text-indigo-400 backdrop-blur-md mb-2.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              <span>Student Workspace · Ndejje University</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-text-primary sm:text-4xl">
              Welcome back, <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">{user?.full_name?.split(' ')[0] || 'Student'}</span> 👋
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-text-secondary font-medium max-w-xl">
              Track active coursework deadlines, manage project group tasks, and monitor your academic progress.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(true)} className="border-indigo-500/30 hover:border-indigo-500/60 shadow-xs">
              <BookOpen className="h-4 w-4 mr-2 text-indigo-500" />
              Course Units ({myCourseUnitIds.length})
            </Button>
            <Link href="/student/coursework">
              <Button size="sm" className="shadow-lg shadow-indigo-500/25">
                <Plus className="h-4 w-4 mr-1.5" />
                Browse Coursework
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>

      {nearestCoursework && nearestCoursework.lock_at && (
        <motion.div variants={itemVariants}>
          <CountdownWidget lockAt={nearestCoursework.lock_at} title={`${nearestCoursework.course_unit?.code || 'Course'} - ${nearestCoursework.title}`} />
        </motion.div>
      )}

      {/* Metric Cards Grid */}
      <motion.div variants={itemVariants} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard title="My Active Groups" value={metrics.myGroups} icon={<Users className="h-6 w-6" />} color="primary" />
        <MetricCard title="Registered Course Units" value={metrics.registeredCourseUnits} icon={<BookOpen className="h-6 w-6" />} color="primary" onClick={() => setIsModalOpen(true)} />
        <MetricCard title="Active Tasks" value={metrics.activeTasks} icon={<Target className="h-6 w-6" />} color="warning" />
      </motion.div>

      {/* Lists Grid */}
      <motion.div variants={itemVariants} className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between px-6 py-4">
            <CardTitle>My Groups</CardTitle>
            <Link href="/student/groups" className="flex items-center gap-1 text-xs font-bold text-primary hover:underline">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="px-6 py-4">
            {recentGroups.length === 0 ? (
              <div className="text-center py-10">
                <Users className="h-10 w-10 mx-auto text-text-muted opacity-60" />
                <p className="mt-2 text-sm font-semibold text-text-secondary">You haven't joined any groups yet</p>
                <p className="text-xs text-text-muted mt-1">Browse coursework to find or create project groups</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentGroups.map(({ group }) => {
                  const memberCount = Array.isArray(group.member_count) && group.member_count[0]?.count != null
                    ? group.member_count[0].count
                    : 0;
                  return (
                    <div
                      key={group.id}
                      onClick={() => {
                        setSelectedGroup({ ...group, _memberCount: memberCount });
                        setGroupModalOpen(true);
                      }}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-surface/80 p-3.5 shadow-xs hover:border-primary/40 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary-light flex items-center justify-center text-primary font-bold">
                          <Users className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-text-primary">{group.name}</p>
                          <p className="text-xs text-text-muted mt-0.5">
                            {group.coursework?.course_unit?.code} - {group.coursework?.title}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-text-muted">
                          {memberCount}/{group.max_members || '?'}
                        </span>
                        <Badge variant={group.status === 'active' ? 'success' : 'warning'} dot>
                          {group.status}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between px-6 py-4">
            <CardTitle>Recent Tasks</CardTitle>
            <Link href="/student/tasks" className="flex items-center gap-1 text-xs font-bold text-primary hover:underline">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="px-6 py-4">
            {recentTasks.length === 0 ? (
              <div className="text-center py-10">
                <BookOpen className="h-10 w-10 mx-auto text-text-muted opacity-60" />
                <p className="mt-2 text-sm font-semibold text-text-secondary">No tasks assigned yet</p>
                <p className="text-xs text-text-muted mt-1">Create tasks to track your coursework progress</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-surface/80 p-3.5 shadow-xs hover:border-primary/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary-light flex items-center justify-center text-primary font-bold">
                        <Target className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-text-primary">{task.title}</p>
                        <p className="text-xs text-text-muted mt-0.5">
                          {task.coursework_id ? 'Coursework task' : 'Personal task'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={task.status === 'completed' || task.status === 'submitted' ? 'success' : task.status === 'in_progress' ? 'primary' : 'secondary'}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Registered Course Units Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registered Course Units" size="lg">
        <div className="space-y-4 pt-2">
          <p className="text-xs text-text-secondary leading-relaxed">
            Select or remove course units you are taking this semester. Group discovery and coursework deadlines will be tailored to these selections.
          </p>

          <div className="max-h-96 space-y-3 overflow-y-auto pr-1 scrollbar-thin">
            {allCourseUnits.map((unit) => {
              const isEnrolled = myCourseUnitIds.includes(unit.id)
              return (
                <div key={unit.id} className="flex items-center justify-between rounded-2xl border border-border/70 bg-surface p-4 shadow-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary text-sm">{unit.code}</span>
                      <span className="font-bold text-text-primary text-sm">{unit.name}</span>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">{unit.description || 'Ndejje University Course Unit'}</p>
                  </div>

                  <Button size="sm" variant={isEnrolled ? 'outline' : 'primary'} onClick={() => toggleCourseUnitEnrollment(unit.id)}>
                    {isEnrolled ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-success mr-1" />
                        Registered
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Register
                      </>
                    )}
                  </Button>
                </div>
              )
            })}
          </div>

          <div className="flex justify-end pt-3 border-t border-border/60">
            <Button onClick={() => setIsModalOpen(false)}>Done</Button>
          </div>
        </div>
      </Modal>
      {/* Group Details Modal */}
      <Modal isOpen={groupModalOpen} onClose={() => {
        setGroupModalOpen(false)
        setSelectedGroup(null)
      }} title={`Group: ${selectedGroup?.name}`} size="lg">
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 shrink-0 rounded-xl bg-primary-light flex items-center justify-center text-primary font-bold">
              <Users className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-text-primary">{selectedGroup?.name}</h2>
              <p className="mt-1 text-xs text-text-muted">
                {selectedGroup?.coursework?.course_unit?.code} - {selectedGroup?.coursework?.title}
              </p>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border/70 bg-surface-hover/40 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Status</p>
                  <div className="mt-1">
                    <Badge variant={selectedGroup?.status === 'active' ? 'success' : 'warning'} dot>
                      {selectedGroup?.status}
                    </Badge>
                  </div>
                </div>
                <div className="rounded-xl border border-border/70 bg-surface-hover/40 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Members</p>
                  <p className="mt-1 text-lg font-black text-text-primary">
                    {selectedGroup?._memberCount ?? 0}
                    <span className="text-sm font-semibold text-text-muted"> / {selectedGroup?.max_members || '—'}</span>
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-border/70 bg-surface-hover/40 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Group Leader</p>
                <p className="mt-1 text-sm font-semibold text-text-primary">
                  {selectedGroup?.leader?.full_name || 'Not assigned'}
                </p>
                {selectedGroup?.leader?.whatsapp_phone && (
                  <p className="text-xs text-text-muted mt-0.5">{selectedGroup.leader.whatsapp_phone}</p>
                )}
              </div>

              {selectedGroup?.description && (
                <div className="mt-3 p-3 rounded-xl border border-border/70 bg-surface-hover/40">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Description</p>
                  <p className="mt-1 text-sm text-text-primary">{selectedGroup?.description}</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
            <Button variant="outline" onClick={() => {
              setGroupModalOpen(false)
              setSelectedGroup(null)
            }}>Close</Button>
            {selectedGroup?.leader?.id === user?.id && (
              <Link href="/student/groups">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setGroupModalOpen(false)
                    setSelectedGroup(null)
                  }}
                >
                  Manage Members
                </Button>
              </Link>
            )}
          </div>
        </div>
      </Modal>
    </motion.div>
  )
}