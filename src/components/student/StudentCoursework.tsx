'use client'

import { useState, useEffect } from 'react'
import { Search, BookOpen, Clock, Lock, CheckCircle, Plus } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
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
  const [enrolledUnitIds, setEnrolledUnitIds] = useState<Set<string>>(new Set())
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', dueDate: '' })
  const [creatingTask, setCreatingTask] = useState(false)

  useEffect(() => {
    fetchEnrollments()
    fetchCourseworks()
  }, [user])

  async function fetchEnrollments() {
    if (!user) {
      setEnrolledUnitIds(new Set())
      return
    }

    const { data, error } = await supabase
      .from('student_course_units')
      .select('course_unit_id')
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (error) {
      console.error('Error fetching enrolled course units:', error)
      setEnrolledUnitIds(new Set())
      return
    }

    setEnrolledUnitIds(new Set((data || []).map((item: { course_unit_id: string }) => item.course_unit_id)))
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
    setNewTask({ title: '', description: '', priority: 'medium', dueDate: '' })
    fetchTasks(coursework.id)
    setTaskModalOpen(true)
  }

  async function handleCreateTask() {
    if (!user?.id || !selectedCoursework || !newTask.title.trim()) return

    setCreatingTask(true)
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          coursework_id: selectedCoursework.id,
          group_id: null,
          title: newTask.title.trim(),
          description: newTask.description.trim() || null,
          status: 'todo',
          priority: newTask.priority,
          due_date: newTask.dueDate ? new Date(newTask.dueDate).toISOString() : null,
        })
        .select()
        .single()

      if (error) throw error
      setTasks((current) => [...current, data])
      setNewTask({ title: '', description: '', priority: 'medium', dueDate: '' })
    } catch (error) {
      console.error('Error creating task:', error)
    } finally {
      setCreatingTask(false)
    }
  }

  const filteredCourseworks = courseworks.filter((cw) => {
    const isForRegisteredCourse = !cw.course_unit_id || enrolledUnitIds.has(cw.course_unit_id)
    if (!isForRegisteredCourse) return false

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
          <div className="space-y-3 rounded-xl border border-border bg-surface-hover/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-text-primary">Add a task</p>
              <Button size="sm" onClick={handleCreateTask} loading={creatingTask} disabled={!newTask.title.trim()}>
                <Plus className="h-4 w-4" />
                Create task
              </Button>
            </div>
            <Input
              label="Task title"
              placeholder="e.g. Draft the introduction"
              value={newTask.title}
              onChange={(event) => setNewTask((current) => ({ ...current, title: event.target.value }))}
            />
            <Textarea
              label="Description"
              placeholder="Optional task details"
              value={newTask.description}
              onChange={(event) => setNewTask((current) => ({ ...current, description: event.target.value }))}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                label="Priority"
                value={newTask.priority}
                onChange={(value) => setNewTask((current) => ({ ...current, priority: value }))}
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                ]}
              />
              <Input
                label="Due date"
                type="datetime-local"
                value={newTask.dueDate}
                onChange={(event) => setNewTask((current) => ({ ...current, dueDate: event.target.value }))}
              />
            </div>
          </div>

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