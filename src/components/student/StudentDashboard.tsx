'use client'

import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Users, BookOpen, Target, TrendingUp, Clock, ArrowRight, Plus, Calendar, Check, AlertCircle, Trash2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { isLocalDataMode, subscribeLocalData } from '@/lib/local-data'

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
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
  }

  return (
    <Card className={onClick ? 'cursor-pointer hover:border-primary/50 transition-all' : ''} onClick={onClick}>
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-text-secondary">{title}</p>
            <p className="mt-2 text-3xl font-bold text-text-primary">{value}</p>
            {change && (
              <p className={cn('mt-1 text-sm font-medium', {
                'text-success': changeType === 'increase',
                'text-danger': changeType === 'decrease',
                'text-text-muted': changeType === 'neutral',
              })}>
                {change}
              </p>
            )}
          </div>
          <div className={cn('rounded-xl p-3', colorClasses[color])}>
            {icon}
          </div>
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

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-danger animate-ping" />
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Nearest Deadline Countdown</p>
            </div>
            <h3 className="mt-1 text-lg font-bold text-text-primary">{title}</h3>
            <p className="text-xs text-text-muted">Due Date: {new Date(lockAt).toLocaleString()}</p>
          </div>

          {isExpired ? (
            <div className="rounded-xl bg-danger/10 px-4 py-2 text-sm font-semibold text-danger">
              Deadline Expired
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-center rounded-xl bg-surface p-2.5 shadow-sm min-w-[55px]">
                <span className="text-xl font-bold text-text-primary">{timeLeft.days}</span>
                <span className="text-[10px] uppercase text-text-muted">Days</span>
              </div>
              <span className="text-xl font-bold text-text-muted">:</span>
              <div className="flex flex-col items-center rounded-xl bg-surface p-2.5 shadow-sm min-w-[55px]">
                <span className="text-xl font-bold text-text-primary">{String(timeLeft.hours).padStart(2, '0')}</span>
                <span className="text-[10px] uppercase text-text-muted">Hrs</span>
              </div>
              <span className="text-xl font-bold text-text-muted">:</span>
              <div className="flex flex-col items-center rounded-xl bg-surface p-2.5 shadow-sm min-w-[55px]">
                <span className="text-xl font-bold text-text-primary">{String(timeLeft.minutes).padStart(2, '0')}</span>
                <span className="text-[10px] uppercase text-text-muted">Min</span>
              </div>
              <span className="text-xl font-bold text-text-muted">:</span>
              <div className="flex flex-col items-center rounded-xl bg-surface p-2.5 shadow-sm min-w-[55px]">
                <span className="text-xl font-bold text-primary">{String(timeLeft.seconds).padStart(2, '0')}</span>
                <span className="text-[10px] uppercase text-text-muted">Sec</span>
              </div>
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
    completedTasks: 0,
    upcomingDeadlines: 0,
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
    if (!isLocalDataMode()) return
    return subscribeLocalData(() => setDataVersion((version) => version + 1))
  }, [])

  useEffect(() => {
    async function fetchData() {
      if (!user) return

      try {
        const [groupsRes, tasksRes, enrollmentsRes, cwRes, allUnitsRes] = await Promise.all([
          supabase
            .from('group_members')
            .select('group:groups(id, name, status, coursework:courseworks(title, course_unit:course_units(code)))')
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
            .order('lock_at', { ascending: true }),
          supabase
            .from('course_units')
            .select('*')
            .eq('is_active', true),
        ])

        const queryError = groupsRes.error || tasksRes.error || enrollmentsRes.error || cwRes.error || allUnitsRes.error
        if (queryError) {
          throw queryError
        }

        const groups = groupsRes.data || []
        const tasks = tasksRes.data || []
        const enrolledIds = (enrollmentsRes.data || []).map((e: any) => e.course_unit_id)

        setMetrics({
          myGroups: groups.length,
          registeredCourseUnits: enrolledIds.length,
          activeTasks: tasks.filter((t: { status: string }) => t.status === 'in_progress').length,
          completedTasks: tasks.filter((t: { status: string }) => t.status === 'completed' || t.status === 'submitted').length,
          upcomingDeadlines: tasks.filter((t: { status: string; due_date?: string | null }) => t.due_date && new Date(t.due_date) > new Date() && t.status !== 'completed').length,
        })

        setRecentGroups(groups.slice(0, 5))
        setRecentTasks(tasks.slice(0, 5))
        setAllCourseUnits(allUnitsRes.data || [])
        setMyCourseUnitIds(enrolledIds)

        const activeCw = (cwRes.data || []).find((c: any) => c.lock_at && new Date(c.lock_at) > new Date())
        setNearestCoursework(activeCw || (cwRes.data || [])[0] || null)
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
        await supabase
          .from('student_course_units')
          .delete()
          .eq('user_id', user.id)
          .eq('course_unit_id', unitId)
        setMyCourseUnitIds((prev) => prev.filter((id) => id !== unitId))
      } else {
        await supabase
          .from('student_course_units')
          .insert({ user_id: user.id, course_unit_id: unitId, status: 'active' })
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

  return (
    <div className="space-y-6">
      {dataError && (
        <div className="rounded-xl border border-danger/20 bg-danger-light p-4 text-sm text-danger" role="alert">
          Unable to load live dashboard data: {dataError}
        </div>
      )}

      <div className="flex flex-col gap-4 rounded-2xl border border-primary/15 bg-primary/[0.04] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-primary">Student Workspace</p>
          <h1 className="mt-1 text-2xl font-bold text-text-primary sm:text-3xl">Welcome back, {user?.full_name?.split(' ')[0]}.</h1>
          <p className="mt-1 text-text-secondary">Ndejje University - Kampala Campus</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setIsModalOpen(true)}>
            <BookOpen className="h-4 w-4 mr-1.5" />
            Manage Registered Course Units ({myCourseUnitIds.length})
          </Button>
          <Link href="/student/coursework">
            <Button>
              <Plus className="h-4 w-4 mr-1.5" />
              Browse Coursework
            </Button>
          </Link>
        </div>
      </div>

      {nearestCoursework && nearestCoursework.lock_at && (
        <CountdownWidget lockAt={nearestCoursework.lock_at} title={`${nearestCoursework.course_unit?.code || 'Course'} - ${nearestCoursework.title}`} />
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="My Groups"
          value={metrics.myGroups}
          icon={<Users className="h-6 w-6" />}
          color="primary"
        />
        <MetricCard
          title="Registered Course Units"
          value={metrics.registeredCourseUnits}
          icon={<BookOpen className="h-6 w-6" />}
          color="primary"
          onClick={() => setIsModalOpen(true)}
        />
        <MetricCard
          title="Completed Tasks"
          value={metrics.completedTasks}
          icon={<TrendingUp className="h-6 w-6" />}
          color="success"
        />
        <MetricCard
          title="Upcoming Deadlines"
          value={metrics.upcomingDeadlines}
          icon={<Clock className="h-6 w-6" />}
          color="danger"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between px-5 py-4 sm:px-6">
            <CardTitle>My Groups</CardTitle>
            <Link href="/student/groups" className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-hover">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent className="px-5 py-4 sm:px-6">
            {recentGroups.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-text-muted" />
                <p className="mt-2 text-text-secondary">You haven't joined any groups yet</p>
                <p className="text-sm text-text-muted">Browse coursework to find or create groups</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentGroups.map(({ group }) => (
                  <div key={group.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-3 transition-colors hover:bg-surface-hover">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-text-primary">{group.name}</p>
                        <p className="text-sm text-text-muted">
                          {group.coursework?.course_unit?.code} - {group.coursework?.title}
                        </p>
                      </div>
                    </div>
                    <Badge variant={group.status === 'active' ? 'success' : 'warning'}>
                      {group.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between px-5 py-4 sm:px-6">
            <CardTitle>Recent Tasks</CardTitle>
            <Link href="/student/tasks" className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-hover">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent className="px-5 py-4 sm:px-6">
            {recentTasks.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 mx-auto text-text-muted" />
                <p className="mt-2 text-text-secondary">No tasks yet</p>
                <p className="text-sm text-text-muted">Create tasks to track your coursework progress</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-3 transition-colors hover:bg-surface-hover">
                    <div className="flex items-center gap-3">
                      <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', {
                        'bg-warning/10 text-warning': task.priority === 'high',
                        'bg-primary/10 text-primary': task.priority === 'medium',
                        'bg-secondary/10 text-secondary': task.priority === 'low',
                      })}>
                        <Target className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-text-primary">{task.title}</p>
                        <p className="text-sm text-text-muted">
                          {task.coursework_id ? 'Coursework task' : 'Personal task'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={task.status === 'completed' || task.status === 'submitted' ? 'success' : task.status === 'in_progress' ? 'primary' : 'secondary'}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                      {task.due_date && (
                        <span className="text-xs text-text-muted">
                          Due {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="My Registered Course Units" size="lg">
        <div className="space-y-4 pt-2">
          <p className="text-sm text-text-secondary">
            Select or remove course units you are taking this semester. Group discovery and coursework deadlines will be tailored to these course units.
          </p>

          <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
            {allCourseUnits.map((unit) => {
              const isEnrolled = myCourseUnitIds.includes(unit.id)
              return (
                <div key={unit.id} className="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5 shadow-sm">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary">{unit.code}</span>
                      <span className="font-semibold text-text-primary">{unit.name}</span>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">{unit.description || 'Ndejje University Course Unit'}</p>
                  </div>

                  <Button
                    size="sm"
                    variant={isEnrolled ? 'outline' : 'primary'}
                    onClick={() => toggleCourseUnitEnrollment(unit.id)}
                  >
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

          <div className="flex justify-end pt-3">
            <Button onClick={() => setIsModalOpen(false)}>Done</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}