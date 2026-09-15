'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  Clock,
  Lock,
  Users,
  UserCheck,
  CheckCircle,
  Plus,
  Trash2,
  Calendar,
  FileText,
  AlertCircle,
  Sparkles,
  ExternalLink,
} from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { Select } from '../ui/Select'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { formatDate, formatRelativeTime, cn } from '@/lib/utils'

interface CourseworkDetailModalProps {
  isOpen: boolean
  onClose: () => void
  coursework: any
  onTasksUpdated?: () => void
}

export function CourseworkDetailModal({
  isOpen,
  onClose,
  coursework,
  onTasksUpdated,
}: CourseworkDetailModalProps) {
  const { user } = useAuth()
  const supabase = createClient()
  const [tasks, setTasks] = useState<any[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [creatingTask, setCreatingTask] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'tasks'>('info')
  const [groupInfo, setGroupInfo] = useState<any>(null)
  const [loadingGroup, setLoadingGroup] = useState(false)

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
  })

  useEffect(() => {
    if (isOpen && coursework?.id && user?.id) {
      fetchTasks()
      if (coursework.work_style === 'group_work') {
        fetchGroupInfo()
      }
    }
  }, [isOpen, coursework?.id, user?.id])

  async function fetchTasks() {
    if (!coursework?.id || !user?.id) return
    setLoadingTasks(true)
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('coursework_id', coursework.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTasks(data || [])
    } catch (err) {
      console.error('Error fetching tasks for coursework:', err)
    } finally {
      setLoadingTasks(false)
    }
  }

  async function fetchGroupInfo() {
    if (!coursework?.id || !user?.id) return
    setLoadingGroup(true)
    try {
      // Find groups for this coursework where user is a member
      const { data } = await supabase
        .from('group_members')
        .select('*, group:groups(*, members:group_members(user_id, role, user:users(full_name, email)))')
        .eq('user_id', user.id)

      const match = data?.find((m: any) => m.group?.coursework_id === coursework.id)
      setGroupInfo(match ? match.group : null)
    } catch (err) {
      console.error('Error fetching group info:', err)
    } finally {
      setLoadingGroup(false)
    }
  }

  async function handleCreateTask() {
    if (!user?.id || !coursework?.id || !newTask.title.trim()) return

    setCreatingTask(true)
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          coursework_id: coursework.id,
          group_id: groupInfo?.id || null,
          title: newTask.title.trim(),
          description: newTask.description.trim() || null,
          status: 'todo',
          priority: newTask.priority,
          due_date: newTask.dueDate ? new Date(newTask.dueDate).toISOString() : coursework.lock_at || null,
        })
        .select()
        .single()

      if (error) throw error

      setTasks((current) => [data, ...current])
      setNewTask({ title: '', description: '', priority: 'medium', dueDate: '' })
      if (onTasksUpdated) onTasksUpdated()
    } catch (error) {
      console.error('Error creating task:', error)
    } finally {
      setCreatingTask(false)
    }
  }

  async function toggleTaskStatus(task: any) {
    if (!user?.id) return
    const newStatus = task.status === 'completed' ? 'todo' : 'completed'
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', task.id)
        .eq('user_id', user.id)

      if (error) throw error

      setTasks((current) =>
        current.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
      )
      if (onTasksUpdated) onTasksUpdated()
    } catch (err) {
      console.error('Error toggling task status:', err)
    }
  }

  async function deleteTask(taskId: string) {
    if (!user?.id) return
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', user.id)

      if (error) throw error

      setTasks((current) => current.filter((t) => t.id !== taskId))
      if (onTasksUpdated) onTasksUpdated()
    } catch (err) {
      console.error('Error deleting task:', err)
    }
  }

  if (!coursework) return null

  const isLocked = coursework.lock_at && new Date(coursework.lock_at) <= new Date()
  const courseCode = coursework.course_unit?.code || 'Course Unit'
  const courseName = coursework.course_unit?.name || ''

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" showCloseButton>
      <div className="space-y-6">
        {/* Header Section */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center rounded-lg bg-primary-light px-2.5 py-1 text-xs font-bold text-primary">
              {courseCode}
            </span>
            {courseName && (
              <span className="text-xs font-medium text-text-muted">
                {courseName}
              </span>
            )}
            <Badge variant="secondary">{coursework.type || 'coursework'}</Badge>
            <Badge
              variant={
                coursework.work_style === 'group_work' ? 'primary' : 'secondary'
              }
            >
              {coursework.work_style === 'group_work'
                ? `Group Work (${coursework.min_group_size || 1}-${coursework.max_group_size || 5})`
                : 'Individual Work'}
            </Badge>
            {isLocked ? (
              <Badge variant="danger">
                <Lock className="h-3 w-3 mr-1" /> Locked
              </Badge>
            ) : (
              <Badge variant="success">
                <Clock className="h-3 w-3 mr-1" /> Open
              </Badge>
            )}
          </div>

          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
            {coursework.title}
          </h1>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border/80 gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={cn(
              'pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2',
              activeTab === 'info'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text-primary'
            )}
          >
            <FileText className="h-4 w-4" />
            Coursework Details & Prompt
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tasks')}
            className={cn(
              'pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2',
              activeTab === 'tasks'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text-primary'
            )}
          >
            <CheckCircle className="h-4 w-4" />
            My Action Items ({tasks.length})
          </button>
        </div>

        {/* TAB 1: DETAILS & PROMPT */}
        {activeTab === 'info' && (
          <div className="space-y-6">
            {/* Deadline & Lock Status Banner */}
            <div className="rounded-2xl border border-border bg-surface-hover/50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-primary-light p-2.5 text-primary">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
                    Submission Deadline
                  </p>
                  <p className="text-base font-bold text-text-primary mt-0.5">
                    {coursework.lock_at
                      ? formatDate(coursework.lock_at)
                      : 'No strict deadline set'}
                  </p>
                  {coursework.lock_at && (
                    <p className="text-xs font-semibold text-primary mt-0.5">
                      {formatRelativeTime(coursework.lock_at)}
                    </p>
                  )}
                </div>
              </div>

              {coursework.submission_mode && (
                <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-border/60">
                  <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
                    Submission Format
                  </p>
                  <p className="text-sm font-semibold text-text-primary capitalize mt-0.5">
                    {coursework.submission_mode.replace('_', ' ')}
                  </p>
                </div>
              )}
            </div>

            {/* Group Work Status Box */}
            {coursework.work_style === 'group_work' && (
              <div className="rounded-2xl border border-primary/30 bg-primary-light/20 p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-primary text-white p-2">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-primary">
                        Group Requirement ({coursework.min_group_size || 1} -{' '}
                        {coursework.max_group_size || 5} members)
                      </p>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {groupInfo ? (
                          <span className="text-success font-bold flex items-center gap-1">
                            <UserCheck className="h-3.5 w-3.5 inline" /> You are in group: "{groupInfo.name}"
                          </span>
                        ) : (
                          'You are currently not registered in a group for this coursework.'
                        )}
                      </p>
                    </div>
                  </div>

                  <Link href="/student/groups" onClick={onClose}>
                    <Button size="sm" variant={groupInfo ? 'outline' : 'primary'}>
                      {groupInfo ? 'View Group' : 'Find / Join Group'}
                      <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Coursework Prompt & Instructions */}
            <div className="space-y-3">
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Instructions & Assignment Prompt
              </h3>

              {coursework.description ? (
                <div className="rounded-2xl border border-border/80 bg-surface p-5 text-sm text-text-primary leading-relaxed whitespace-pre-wrap font-sans">
                  {coursework.description}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-6 text-center text-text-muted text-sm">
                  No detailed description provided by the coordinator yet.
                </div>
              )}
            </div>

            {/* Quick action to add a sub-task */}
            <div className="pt-2 border-t border-border/60 flex items-center justify-between">
              <p className="text-xs text-text-muted">
                Need to break this coursework into sub-tasks?
              </p>
              <Button size="sm" variant="outline" onClick={() => setActiveTab('tasks')}>
                Manage Sub-tasks ({tasks.length})
              </Button>
            </div>
          </div>
        )}

        {/* TAB 2: SUB-TASKS & ACTION ITEMS */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            {/* Create Task Form */}
            <div className="rounded-2xl border border-border bg-surface-hover/40 p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Add New Sub-task / Personal Commitment
              </p>

              <Input
                placeholder="Task title (e.g. Draft introduction section)"
                value={newTask.title}
                onChange={(e) =>
                  setNewTask((prev) => ({ ...prev, title: e.target.value }))
                }
              />

              <Textarea
                placeholder="Optional notes or details..."
                value={newTask.description}
                rows={2}
                onChange={(e) =>
                  setNewTask((prev) => ({ ...prev, description: e.target.value }))
                }
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  label="Priority"
                  value={newTask.priority}
                  onChange={(val) =>
                    setNewTask((prev) => ({ ...prev, priority: val }))
                  }
                  options={[
                    { value: 'low', label: 'Low Priority' },
                    { value: 'medium', label: 'Medium Priority' },
                    { value: 'high', label: 'High Priority' },
                  ]}
                />
                <Input
                  label="Target Due Date"
                  type="datetime-local"
                  value={newTask.dueDate}
                  onChange={(e) =>
                    setNewTask((prev) => ({ ...prev, dueDate: e.target.value }))
                  }
                />
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  size="sm"
                  onClick={handleCreateTask}
                  loading={creatingTask}
                  disabled={!newTask.title.trim()}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Sub-task
                </Button>
              </div>
            </div>

            {/* Task List */}
            {loadingTasks ? (
              <div className="space-y-2">
                <div className="h-16 animate-pulse rounded-xl bg-surface-hover" />
                <div className="h-16 animate-pulse rounded-xl bg-surface-hover" />
              </div>
            ) : tasks.length === 0 ? (
              <div className="py-8 text-center rounded-2xl border border-dashed border-border">
                <CheckCircle className="h-10 w-10 mx-auto text-text-muted opacity-50" />
                <p className="mt-2 text-sm font-semibold text-text-secondary">
                  No sub-tasks added yet
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  Create personal tasks above to track your research, drafting, and submission milestones.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between gap-3 p-4 rounded-xl border border-border bg-surface hover:bg-surface-hover/60 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleTaskStatus(task)}
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors',
                          task.status === 'completed'
                            ? 'border-success bg-success text-white'
                            : 'border-border text-transparent hover:border-primary'
                        )}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>

                      <div className="min-w-0">
                        <p
                          className={cn(
                            'font-semibold text-sm text-text-primary',
                            task.status === 'completed' && 'line-through text-text-muted'
                          )}
                        >
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-xs text-text-muted truncate mt-0.5">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <Badge
                        variant={
                          task.priority === 'high'
                            ? 'danger'
                            : task.priority === 'medium'
                            ? 'warning'
                            : 'secondary'
                        }
                      >
                        {task.priority}
                      </Badge>

                      {task.due_date && (
                        <span className="text-xs text-text-muted hidden sm:inline">
                          {formatDate(task.due_date)}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => deleteTask(task.id)}
                        className="p-1 text-text-muted hover:text-danger transition-colors"
                        title="Delete task"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
