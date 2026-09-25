'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Check,
  Clock3,
  ListChecks,
  LockKeyhole,
  BookOpen,
  Calendar,
  Layers,
  CheckCircle,
  Plus,
  Trash2,
  Lock,
  Clock,
  ChevronRight,
  Filter,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatRelativeTime, cn } from '@/lib/utils'
import { CourseworkDetailModal } from './CourseworkDetailModal'
import { getStudentCourseUnitIds } from '@/lib/faculty-access'

function daysUntil(dateStr: string) {
  return Math.max(0, Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000))
}

export function StudentTasks() {
  const { user } = useAuth()
  const supabase = createClient()

  const [courseworks, setCourseworks] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [enrolledUnitIds, setEnrolledUnitIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [dataVersion, setDataVersion] = useState(0)

  // Filtering
  const [activeTab, setActiveTab] = useState<'all' | 'coursework' | 'tasks'>('all')
  const [filterEnrolledOnly, setFilterEnrolledOnly] = useState(false)

  // Modal State
  const [selectedCoursework, setSelectedCoursework] = useState<any>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    async function loadData() {
      if (!user) return
      setLoading(true)

      try {
        const allowedCourseUnitIds = await getStudentCourseUnitIds(supabase, user)
        const allowedIds = new Set(allowedCourseUnitIds)
        // 1. Fetch enrolled course units
        const { data: enrollments } = await supabase
          .from('student_course_units')
          .select('course_unit_id')
          .eq('user_id', user.id)
          .eq('status', 'active')

        const unitSet = new Set((enrollments || [])
          .map((e: any) => e.course_unit_id)
          .filter((id: string) => allowedIds.has(id)))
        setEnrolledUnitIds(unitSet)

        // 2. Fetch published courseworks
        const { data: cwData } = await supabase
          .from('courseworks')
          .select('*, course_unit:course_units(code, name)')
          .eq('is_published', true)
          .in('course_unit_id', allowedCourseUnitIds.length ? allowedCourseUnitIds : ['00000000-0000-0000-0000-000000000000'])
          .order('lock_at', { ascending: true })

        setCourseworks(cwData || [])

        // 3. Fetch student tasks
        const { data: taskData } = await supabase
          .from('tasks')
          .select('*, coursework:courseworks(title, course_unit:course_units(code, name))')
          .eq('user_id', user.id)
          .order('due_date', { ascending: true })

        setTasks(taskData || [])
      } catch (err) {
        console.error('Error loading student tasks & deadlines:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user, dataVersion])

  async function toggleTask(task: any) {
    if (!user?.id) return
    const nextStatus = task.status === 'completed' ? 'todo' : 'completed'
    try {
      await supabase
        .from('tasks')
        .update({ status: nextStatus })
        .eq('id', task.id)
        .eq('user_id', user.id)

      setDataVersion((v) => v + 1)
    } catch (err) {
      console.error('Failed to toggle task:', err)
    }
  }

  async function deleteTask(taskId: string) {
    if (!user?.id) return
    try {
      await supabase.from('tasks').delete().eq('id', taskId).eq('user_id', user.id)
      setDataVersion((v) => v + 1)
    } catch (err) {
      console.error('Failed to delete task:', err)
    }
  }

  const handleOpenCourseworkModal = (cw: any) => {
    setSelectedCoursework(cw)
    setModalOpen(true)
  }

  // Filter courseworks
  const relevantCourseworks = courseworks.filter((cw) => {
    if (filterEnrolledOnly && cw.course_unit_id) {
      return enrolledUnitIds.has(cw.course_unit_id)
    }
    return true
  })

  // Upcoming items for Hero Banner
  const upcomingCwDeadlines = relevantCourseworks.filter(
    (cw) => cw.lock_at && new Date(cw.lock_at) > new Date()
  )

  const nearestCoursework = upcomingCwDeadlines[0] || relevantCourseworks[0] || null

  return (
    <div className="space-y-7">
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 via-violet-500/5 to-transparent p-5 backdrop-blur-xl shadow-lg sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              <Clock3 className="h-3.5 w-3.5 text-indigo-500 animate-pulse" />
              Student Portal
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
              Tasks <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">& Deadlines</span>
            </h1>
            <p className="mt-1 text-sm text-text-secondary">Keep track of upcoming coursework deadlines, group commitments, and action items.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/student/coursework">
              <Button variant="outline" className="border-border/60 backdrop-blur-md">
                <ListChecks className="h-4 w-4 mr-1.5" />
                Browse Coursework
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Hero Widget: Next on your desk */}
      <section className="overflow-hidden rounded-2xl bg-[#20312d] p-6 text-[#f4f1e9] shadow-xl shadow-[#20312d]/10 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xl">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-[#f0a35b] animate-ping" />
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f0a35b]">
                Next Deadline On Your Desk
              </p>
            </div>

            {nearestCoursework ? (
              <>
                <div className="mt-3 flex items-center gap-2">
                  <span className="rounded-md bg-white/10 px-2.5 py-0.5 text-xs font-bold text-[#f0a35b]">
                    {nearestCoursework.course_unit?.code || 'Course'}
                  </span>
                  <span className="text-xs text-[#bdcbc1]">
                    {nearestCoursework.course_unit?.name}
                  </span>
                </div>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {nearestCoursework.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#bdcbc1] line-clamp-2">
                  {nearestCoursework.description || 'No detailed instructions provided.'}
                </p>
              </>
            ) : (
              <>
                <h2 className="mt-3 text-2xl font-semibold">Nothing urgent right now</h2>
                <p className="mt-2 text-sm leading-6 text-[#bdcbc1]">
                  When your course coordinator publishes coursework deadlines, your next urgent milestone will appear here.
                </p>
              </>
            )}
          </div>

          <div className="flex shrink-0 items-center justify-between sm:flex-col sm:items-end gap-3">
            <Clock3 className="h-8 w-8 text-[#f0a35b]" />
            {nearestCoursework && (
              <Button
                size="sm"
                className="bg-[#f0a35b] text-[#20312d] hover:bg-[#e0934b] font-bold"
                onClick={() => handleOpenCourseworkModal(nearestCoursework)}
              >
                View Info & Tasks
              </Button>
            )}
          </div>
        </div>

        {nearestCoursework && nearestCoursework.lock_at && (
          <div className="mt-8 flex flex-wrap items-end justify-between border-t border-white/10 pt-5 gap-4">
            <div>
              <p className="text-4xl font-extrabold text-white">
                {daysUntil(nearestCoursework.lock_at)}
              </p>
              <p className="text-xs font-medium text-[#bdcbc1]">days remaining</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-[#f0a35b]">
                Due {formatDate(nearestCoursework.lock_at)}
              </p>
              <p className="text-xs text-[#bdcbc1]">
                {formatRelativeTime(nearestCoursework.lock_at)}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Tabs and Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-4">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={activeTab === 'all' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('all')}
          >
            All Items ({relevantCourseworks.length + tasks.length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'coursework' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('coursework')}
          >
            Coursework Deadlines ({relevantCourseworks.length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'tasks' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('tasks')}
          >
            Sub-tasks & Checklist ({tasks.length})
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-text-secondary">
            <input
              type="checkbox"
              checked={filterEnrolledOnly}
              onChange={(e) => setFilterEnrolledOnly(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary"
            />
            <span>Show my enrolled course units only</span>
          </label>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="space-y-4">
          <div className="h-24 animate-pulse rounded-2xl bg-surface-hover" />
          <div className="h-24 animate-pulse rounded-2xl bg-surface-hover" />
          <div className="h-24 animate-pulse rounded-2xl bg-surface-hover" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* SECTION 1: COURSEWORK DEADLINES */}
          {(activeTab === 'all' || activeTab === 'coursework') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Official Coursework Deadlines
                </h2>
                <Badge variant="secondary">{relevantCourseworks.length}</Badge>
              </div>

              {relevantCourseworks.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center text-text-muted text-sm">
                    No published coursework deadlines found matching your filters.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-1">
                  {relevantCourseworks.map((cw) => {
                    const isLocked = cw.lock_at && new Date(cw.lock_at) <= new Date()
                    const isEnrolled = cw.course_unit_id
                      ? enrolledUnitIds.has(cw.course_unit_id)
                      : false

                    return (
                      <Card
                        key={cw.id}
                        className="hover:border-primary/40 transition-all cursor-pointer"
                        onClick={() => handleOpenCourseworkModal(cw)}
                      >
                        <CardContent className="p-5">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-1.5 max-w-2xl">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-md bg-primary-light px-2 py-0.5 text-xs font-bold text-primary">
                                  {cw.course_unit?.code || 'Course Unit'}
                                </span>
                                {cw.course_unit?.name && (
                                  <span className="text-xs font-medium text-text-muted">
                                    {cw.course_unit.name}
                                  </span>
                                )}
                                {isEnrolled && (
                                  <Badge variant="success" dot>
                                    Enrolled
                                  </Badge>
                                )}
                                <Badge variant="secondary">{cw.type || 'coursework'}</Badge>
                                <Badge
                                  variant={cw.work_style === 'group_work' ? 'primary' : 'secondary'}
                                >
                                  {cw.work_style === 'group_work' ? 'Group Work' : 'Individual'}
                                </Badge>
                              </div>

                              <h3 className="text-lg font-bold text-text-primary">
                                {cw.title}
                              </h3>

                              <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                                {cw.description || 'No detailed instructions provided.'}
                              </p>
                            </div>

                            <div className="flex items-center justify-between sm:flex-col sm:items-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-border/60">
                              <div className="text-left sm:text-right">
                                {isLocked ? (
                                  <Badge variant="danger">
                                    <Lock className="h-3 w-3 mr-1" /> Locked
                                  </Badge>
                                ) : (
                                  <Badge variant="success">
                                    <Clock className="h-3 w-3 mr-1" /> Open
                                  </Badge>
                                )}
                                <p className="mt-1 text-xs font-bold text-text-primary">
                                  {cw.lock_at ? formatDate(cw.lock_at) : 'No deadline'}
                                </p>
                              </div>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpenCourseworkModal(cw)
                                }}
                              >
                                View Info & Tasks
                                <ChevronRight className="h-4 w-4 ml-1" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: SUB-TASKS & CHECKLIST */}
          {(activeTab === 'all' || activeTab === 'tasks') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-success" />
                  Action Items & Personal Tasks
                </h2>
                <Badge variant="secondary">{tasks.length}</Badge>
              </div>

              {tasks.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center text-text-muted text-sm">
                    No action items created yet. Open any coursework to add personal sub-tasks.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <Card key={task.id} className="p-4 hover:border-primary/30 transition-colors">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => toggleTask(task)}
                            className={cn(
                              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors',
                              task.status === 'completed'
                                ? 'border-success bg-success text-white'
                                : 'border-border text-transparent hover:border-primary'
                            )}
                          >
                            <Check className="h-4 w-4" />
                          </button>

                          <div className="min-w-0">
                            <p
                              className={cn(
                                'font-bold text-sm text-text-primary',
                                task.status === 'completed' && 'line-through text-text-muted opacity-60'
                              )}
                            >
                              {task.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {task.coursework?.title && (
                                <span className="text-xs font-semibold text-primary">
                                  {task.coursework.course_unit?.code || 'CW'}: {task.coursework.title}
                                </span>
                              )}
                              {task.description && (
                                <span className="text-xs text-text-muted truncate">
                                  · {task.description}
                                </span>
                              )}
                            </div>
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
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Coursework Detail & Tasks Modal */}
      <CourseworkDetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        coursework={selectedCoursework}
        onTasksUpdated={() => setDataVersion((v) => v + 1)}
      />
    </div>
  )
}