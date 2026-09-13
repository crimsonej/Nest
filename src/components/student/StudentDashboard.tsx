'use client'

import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Users, BookOpen, Target, TrendingUp, Clock, ArrowRight, Plus } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { formatNumber } from '@/lib/utils'
import { isLocalDataMode, subscribeLocalData } from '@/lib/local-data'

interface MetricCardProps {
  title: string
  value: string | number
  change?: string
  changeType?: 'increase' | 'decrease' | 'neutral'
  icon: React.ReactNode
  color: 'primary' | 'success' | 'warning' | 'danger'
}

function MetricCard({ title, value, change, changeType = 'neutral', icon, color }: MetricCardProps) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
  }

  return (
    <Card>
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
  const [dataVersion, setDataVersion] = useState(0)

  useEffect(() => {
    if (!isLocalDataMode()) return
    return subscribeLocalData(() => setDataVersion((version) => version + 1))
  }, [])

  useEffect(() => {
    async function fetchData() {
      if (!user) return

      try {
        const [groupsRes, tasksRes, enrollmentsRes] = await Promise.all([
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
            .select('id')
            .eq('user_id', user.id)
            .eq('status', 'active'),
        ])

          const queryError = groupsRes.error || tasksRes.error || enrollmentsRes.error
        if (queryError) throw queryError

        const groups = groupsRes.data || []
        const tasks = tasksRes.data || []

        setMetrics({
          myGroups: groups.length,
          registeredCourseUnits: enrollmentsRes.data?.length || 0,
          activeTasks: tasks.filter((t: { status: string }) => t.status === 'in_progress').length,
          completedTasks: tasks.filter((t: { status: string }) => t.status === 'completed' || t.status === 'submitted').length,
          upcomingDeadlines: tasks.filter((t: { status: string; due_date?: string | null }) => t.due_date && new Date(t.due_date) > new Date() && t.status !== 'completed').length,
        })

        setRecentGroups(groups.slice(0, 5))
        setRecentTasks(tasks.slice(0, 5))
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        setDataError(error instanceof Error ? error.message : 'Unable to load dashboard data from Supabase.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, dataVersion])

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
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-primary">Student workspace</p>
          <h1 className="mt-1 text-2xl font-bold text-text-primary sm:text-3xl">Welcome back, {user?.full_name?.split(' ')[0]}.</h1>
          <p className="mt-1 text-text-secondary">Your groups, tasks, and deadlines at a glance.</p>
        </div>
        <Link href="/student/coursework">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Find coursework
          </Button>
        </Link>
      </div>

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
        />
        <MetricCard
          title="Completed"
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
    </div>
  )
}