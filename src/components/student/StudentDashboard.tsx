'use client'

import { cn } from '@/lib/utils'
import { BarChart3, Users, BookOpen, Target, TrendingUp, AlertCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { formatNumber } from '@/lib/utils'

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
      <CardContent className="p-6">
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
          <div className={cn('p-3 rounded-xl', colorClasses[color])}>
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
    activeTasks: 0,
    completedTasks: 0,
    upcomingDeadlines: 0,
  })
  const [loading, setLoading] = useState(true)
  const [recentGroups, setRecentGroups] = useState<any[]>([])
  const [recentTasks, setRecentTasks] = useState<any[]>([])

  useEffect(() => {
    async function fetchData() {
      if (!user) return

      try {
        const [groupsRes, tasksRes] = await Promise.all([
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
        ])

        const groups = groupsRes.data || []
        const tasks = tasksRes.data || []

        setMetrics({
          myGroups: groups.length,
          activeTasks: tasks.filter((t) => t.status === 'in_progress').length,
          completedTasks: tasks.filter((t) => t.status === 'completed' || t.status === 'submitted').length,
          upcomingDeadlines: tasks.filter((t) => t.due_date && new Date(t.due_date) > new Date() && t.status !== 'completed').length,
        })

        setRecentGroups(groups.slice(0, 5))
        setRecentTasks(tasks.slice(0, 5))
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, supabase])

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
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Welcome back, {user?.full_name?.split(' ')[0]}!</h1>
        <p className="text-text-secondary mt-1">Here's an overview of your academic activity.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="My Groups"
          value={metrics.myGroups}
          icon={<Users className="h-6 w-6" />}
          color="primary"
        />
        <MetricCard
          title="Active Tasks"
          value={metrics.activeTasks}
          icon={<BookOpen className="h-6 w-6" />}
          color="warning"
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>My Groups</CardTitle>
            <Badge variant="primary">{recentGroups.length}</Badge>
          </CardHeader>
          <CardContent>
            {recentGroups.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-text-muted" />
                <p className="mt-2 text-text-secondary">You haven't joined any groups yet</p>
                <p className="text-sm text-text-muted">Browse coursework to find or create groups</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentGroups.map(({ group }) => (
                  <div key={group.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-hover transition-colors">
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Tasks</CardTitle>
            <Badge variant="secondary">{recentTasks.length}</Badge>
          </CardHeader>
          <CardContent>
            {recentTasks.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 mx-auto text-text-muted" />
                <p className="mt-2 text-text-secondary">No tasks yet</p>
                <p className="text-sm text-text-muted">Create tasks to track your coursework progress</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-hover transition-colors">
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