'use client'

import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Users, BookOpen, Target, ArrowRight, Plus, Check } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { getStudentCourseUnitIds } from '@/lib/faculty-access'

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
    primary: 'bg-primary-light text-primary border border-primary/20',
    success: 'bg-success-light text-success border border-success/20',
    warning: 'bg-warning-light text-warning border border-warning/20',
    danger: 'bg-danger-light text-danger border border-danger/20',
  }

  return (
    <Card hover={Boolean(onClick)} onClick={onClick}>
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-text-muted">{title}</p>
            <p className="mt-2 text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight">{value}</p>
            {change && (
              <p
                className={cn('mt-1.5 text-xs font-semibold', {
                  'text-success': changeType === 'increase',
                  'text-danger': changeType === 'decrease',
                  'text-text-muted': changeType === 'neutral',
                })}
              >
                {change}
              </p>
            )}
          </div>
          <div className={cn('rounded-2xl p-3 shadow-xs', colorClasses[color])}>{icon}</div>
        </div>
      </CardContent>
    </Card>
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
  const segments = [
    { label: 'Days', value: timeLeft.days },
    { label: 'Hours', value: timeLeft.hours },
    { label: 'Minutes', value: timeLeft.minutes },
    { label: 'Seconds', value: timeLeft.seconds },
  ]

  return (
    <Card className="relative overflow-hidden border-primary/30 bg-surface/90 shadow-xl backdrop-blur-xl">
      <div className="absolute inset-0 bg-radial-gradient(circle_at_top_right,_rgba(225,29,72,0.12),_transparent_40%) pointer-events-none" />
      <CardContent className="relative p-6 sm:p-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-xl">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-danger"></span>
              </span>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary">Next Deadline</p>
            </div>
            <h3 className="mt-2 text-xl font-extrabold tracking-tight text-text-primary sm:text-2xl">{title}</h3>
            <p className="mt-1 text-xs font-medium text-text-muted">
              Due {new Date(lockAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          </div>

          {isExpired ? (
            <div className="inline-flex items-center self-start rounded-2xl border border-danger/20 bg-danger-light px-4 py-2 text-xs font-bold text-danger">
              Deadline Expired
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3">
              {segments.map((segment) => (
                <div
                  key={segment.label}
                  className="flex w-full sm:w-auto sm:min-w-[80px] flex-col items-center rounded-2xl border border-border/80 bg-surface/95 px-3 py-2 sm:px-3.5 sm:py-2.5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md"
                >
                  <span className="text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
                    {String(segment.value).padStart(2, '0')}
                  </span>
                  <span className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
                    {segment.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

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
            .select('group:groups!inner(id, name, status, coursework:courseworks(title, course_unit_id, course_unit:course_units(code)))')
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

        const queryError = groupsRes.error || tasksRes.error || enrollmentsRes.error || cwRes.error || allUnitsRes.error
        if (queryError) {
          throw queryError
        }

        const allowedIds = new Set(allowedCourseUnitIds)
        const groups = (groupsRes.data || []).filter((row: any) => allowedIds.has(row.group?.coursework?.course_unit_id))
        const tasks = tasksRes.data || []
        const enrolledIds = Array.from(new Set((enrollmentsRes.data || [])
          .map((e: any) => e.course_unit_id)
          .filter((id: string) => id && allowedIds.has(id))))
        const relevantCourseworks = (cwRes.data || []).filter((coursework: any) => {
          if (!coursework.course_unit_id) return true
          return enrolledIds.includes(coursework.course_unit_id)
        })

        setMetrics({
          myGroups: groups.length,
          registeredCourseUnits: enrolledIds.length,
          activeTasks: tasks.filter((t: { status: string }) => t.status === 'in_progress').length,
        })

        setRecentGroups(groups.slice(0, 5))
        setRecentTasks(tasks.slice(0, 5))
        setAllCourseUnits(allUnitsRes.data || [])
        setMyCourseUnitIds(enrolledIds)

        const activeCw = relevantCourseworks.find((coursework: any) => coursework.lock_at && new Date(coursework.lock_at) > new Date())
        setNearestCoursework(activeCw || relevantCourseworks[0] || null)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        setDataError(error instanceof Error ? error.message : 'Unable to load dashboard data.')
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
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-secondary/20 rounded w-3/4" />
                <div className="h-8 bg-secondary/20 rounded w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
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
        className="flex flex-col gap-4 rounded-3xl border border-primary/20 bg-primary-light/30 p-6 sm:flex-row sm:items-center sm:justify-between shadow-xs backdrop-blur-md"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Student Workspace</p>
          <h1 className="mt-1 text-2xl font-extrabold text-text-primary sm:text-3xl tracking-tight">
            Welcome back, {user?.full_name?.split(' ')[0]}.
          </h1>
          <p className="mt-1 text-xs text-text-secondary font-medium">Ndejje University · Kampala Campus</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button variant="outline" size="sm" onClick={() => setIsModalOpen(true)}>
            <BookOpen className="h-4 w-4 mr-1.5" />
            Course Units ({myCourseUnitIds.length})
          </Button>
          <Link href="/student/coursework">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Browse Coursework
            </Button>
          </Link>
        </div>
      </motion.div>

      {nearestCoursework && nearestCoursework.lock_at && (
        <motion.div variants={itemVariants}>
          <CountdownWidget lockAt={nearestCoursework.lock_at} title={`${nearestCoursework.course_unit?.code || 'Course'} - ${nearestCoursework.title}`} />
        </motion.div>
      )}

      {/* Metric Cards Grid */}
      <motion.div variants={itemVariants} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="My Groups" value={metrics.myGroups} icon={<Users className="h-6 w-6" />} color="primary" />
        <MetricCard title="Course Units" value={metrics.registeredCourseUnits} icon={<BookOpen className="h-6 w-6" />} color="primary" onClick={() => setIsModalOpen(true)} />
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
                {recentGroups.map(({ group }) => (
                  <div key={group.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-surface/80 p-3.5 shadow-xs hover:border-primary/40 transition-colors">
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
                    <Badge variant={group.status === 'active' ? 'success' : 'warning'} dot>
                      {group.status}
                    </Badge>
                  </div>
                ))}
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
    </motion.div>
  )
}