'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Filter, BookOpen, Clock, Lock, CheckCircle, AlertTriangle, UserPlus, UserMinus } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Badge } from '../ui/Badge'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import { DataTable } from '../ui/DataTable'
import { Modal } from '../ui/Modal'
import { cn } from '@/lib/utils'

export function StudentCoursework() {
  const { user } = useAuth()
  const supabase = createClient()
  const [courseworks, setCourseworks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedCoursework, setSelectedCoursework] = useState<any>(null)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [tasks, setTasks] = useState<any[]>([])
  const [courseUnits, setCourseUnits] = useState<any[]>([])
  const [enrolledUnitIds, setEnrolledUnitIds] = useState<Set<string>>(new Set())
  const [enrollmentError, setEnrollmentError] = useState('')

  useEffect(() => {
    fetchCourseworks()
    fetchEnrollments()
  }, [user])

  async function fetchEnrollments() {
    if (!user) return
    const [{ data: units, error: unitsError }, { data: enrollments, error: enrollmentsError }] = await Promise.all([
      supabase.from('course_units').select('id, code, name, description').eq('is_active', true).order('code'),
      supabase.from('student_course_units').select('course_unit_id').eq('user_id', user.id).eq('status', 'active'),
    ])
    if (unitsError || enrollmentsError) {
      setEnrollmentError((unitsError || enrollmentsError)?.message || 'Unable to load course-unit enrollment.')
      return
    }
    setCourseUnits(units || [])
    setEnrolledUnitIds(new Set((enrollments || []).map((enrollment: { course_unit_id: string }) => enrollment.course_unit_id)))
  }

  async function toggleEnrollment(courseUnitId: string) {
    if (!user) return
    setEnrollmentError('')
    const isEnrolled = enrolledUnitIds.has(courseUnitId)
    const result = isEnrolled
      ? await supabase.from('student_course_units').update({ status: 'withdrawn' }).eq('user_id', user.id).eq('course_unit_id', courseUnitId)
      : await supabase.from('student_course_units').upsert({ user_id: user.id, course_unit_id: courseUnitId, status: 'active' }, { onConflict: 'user_id,course_unit_id' })
    if (result.error) {
      setEnrollmentError(result.error.message)
      return
    }
    await fetchEnrollments()
  }

  async function fetchCourseworks() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('courseworks')
        .select(`
          *,
          course_unit:course_units(code, name),
          tasks:tasks(count),
          groups:groups(count)
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
      setCourseworks(data || [])
    } catch (error) {
      console.error('Error fetching courseworks:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchTasks(courseworkId: string) {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('coursework_id', courseworkId)
      .eq('user_id', user?.id)
      .order('due_date', { ascending: true })
    setTasks(data || [])
  }

  const handleViewTasks = (coursework: any) => {
    setSelectedCoursework(coursework)
    fetchTasks(coursework.id)
    setTaskModalOpen(true)
  }

  const filteredCourseworks = courseworks.filter((cw) => {
    const matchesSearch = cw.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cw.course_unit?.code.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === 'all' || cw.type === typeFilter
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'upcoming' && cw.lock_at && new Date(cw.lock_at) > new Date()) ||
      (statusFilter === 'locked' && cw.lock_at && new Date(cw.lock_at) <= new Date())
    return matchesSearch && matchesType && matchesStatus
  })

  const columns = [
    {
      key: 'title',
      header: 'Coursework',
      render: (row: any) => (
        <div>
          <p className="font-medium text-text-primary">{row.title}</p>
          <p className="text-sm text-text-muted">{row.course_unit?.code} - {row.course_unit?.name}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row: any) => (
        <Badge variant="secondary" dot>{row.type}</Badge>
      ),
    },
    {
      key: 'group_size',
      header: 'Group Size',
      render: (row: any) => `${row.min_group_size} - ${row.max_group_size} members`,
    },
    {
      key: 'lock_status',
      header: 'Status',
      render: (row: any) => {
        if (!row.lock_at) return <Badge variant="primary">Open</Badge>
        const isLocked = new Date(row.lock_at) <= new Date()
        return isLocked ? (
          <Badge variant="danger"><Lock className="h-3 w-3 mr-1" /> Locked</Badge>
        ) : (
          <Badge variant="success"><Clock className="h-3 w-3 mr-1" /> Open</Badge>
        )
      },
    },
    {
      key: 'lock_at',
      header: 'Lock Date',
      render: (row: any) => row.lock_at ? formatDate(row.lock_at) : 'No deadline',
    },
    {
      key: 'tasks_count',
      header: 'Tasks',
      render: (row: any) => row.tasks?.[0]?.count || 0,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <Button variant="outline" size="sm" onClick={() => handleViewTasks(row)}>
          View Tasks
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Coursework & Assignments</h1>
          <p className="text-text-secondary">View and manage your coursework tasks and deadlines</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Course Units</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {enrollmentError && <p className="rounded-lg bg-danger-light p-3 text-sm text-danger" role="alert">{enrollmentError}</p>}
          {courseUnits.length === 0 ? (
            <p className="text-sm text-text-muted">No active course units are available.</p>
          ) : courseUnits.map((courseUnit) => {
            const enrolled = enrolledUnitIds.has(courseUnit.id)
            return (
              <div key={courseUnit.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                <div>
                  <p className="font-medium text-text-primary">{courseUnit.code} - {courseUnit.name}</p>
                  <p className="text-sm text-text-muted">{courseUnit.description || 'Course unit enrollment'}</p>
                </div>
                <Button variant={enrolled ? 'outline' : 'primary'} size="sm" onClick={() => toggleEnrollment(courseUnit.id)}>
                  {enrolled ? <UserMinus className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                  {enrolled ? 'Remove' : 'Register'}
                </Button>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <Input
                placeholder="Search coursework..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: 'all', label: 'All Types' },
                { value: 'assignment', label: 'Assignment' },
                { value: 'project', label: 'Project' },
                { value: 'presentation', label: 'Presentation' },
                { value: 'lab', label: 'Lab' },
              ]}
              className="w-40"
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'upcoming', label: 'Upcoming' },
                { value: 'locked', label: 'Locked' },
              ]}
              className="w-40"
            />
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={filteredCourseworks}
        keyExtractor={(row) => row.id}
        loading={loading}
        emptyMessage="No coursework found"
      />

      <Modal isOpen={taskModalOpen} onClose={() => setTaskModalOpen(false)} title={`${selectedCoursework?.title} - Tasks`} size="lg">
        <div className="space-y-4">
          {tasks.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 mx-auto text-text-muted" />
              <p className="mt-2 text-text-secondary">No tasks yet</p>
              <p className="text-sm text-text-muted">Create tasks to track your progress</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-surface-hover transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', {
                      'bg-warning/10 text-warning': task.priority === 'high',
                      'bg-primary/10 text-primary': task.priority === 'medium',
                      'bg-secondary/10 text-secondary': task.priority === 'low',
                    })}>
                      <CheckCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">{task.title}</p>
                      <p className="text-sm text-text-muted">
                        {task.description ? task.description.substring(0, 100) + '...' : 'No description'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={
                      task.status === 'completed' || task.status === 'submitted' ? 'success' :
                      task.status === 'in_progress' ? 'primary' : 'secondary'
                    }>
                      {task.status.replace('_', ' ')}
                    </Badge>
                    <Badge variant={
                      task.priority === 'high' ? 'danger' :
                      task.priority === 'medium' ? 'warning' : 'secondary'
                    }>
                      {task.priority}
                    </Badge>
                    {task.due_date && (
                      <span className={cn('text-sm', new Date(task.due_date) < new Date() && task.status !== 'completed' ? 'text-danger' : 'text-text-muted')}>
                        {formatRelativeTime(task.due_date)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}