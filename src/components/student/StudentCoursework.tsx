'use client'

import { useState, useEffect } from 'react'
import { Search, BookOpen, Clock, Lock } from 'lucide-react'
import { Card, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Badge } from '../ui/Badge'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { DataTable } from '../ui/DataTable'
import { CourseworkDetailModal } from './CourseworkDetailModal'
import { getStudentCourseUnitIds } from '@/lib/faculty-access'

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
  const [enrolledUnitIds, setEnrolledUnitIds] = useState<Set<string>>(new Set())

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
      if (!user) {
        setCourseworks([])
        return
      }
      const allowedCourseUnitIds = await getStudentCourseUnitIds(supabase, user)
      const { data } = await supabase
        .from('courseworks')
        .select(`
          *,
          course_unit:course_units(code, name),
          tasks:tasks(count),
          groups:groups(count)
        `)
        .eq('is_published', true)
        .in('course_unit_id', allowedCourseUnitIds.length ? allowedCourseUnitIds : ['00000000-0000-0000-0000-000000000000'])
        .order('created_at', { ascending: false })

      setCourseworks(data || [])
    } catch (error) {
      console.error('Error fetching courseworks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewCourseworkDetails = (coursework: any) => {
    setSelectedCoursework(coursework)
    setTaskModalOpen(true)
  }

  const filteredCourseworks = courseworks.filter((cw) => {
    const isForRegisteredCourse = !cw.course_unit_id || enrolledUnitIds.has(cw.course_unit_id)
    if (!isForRegisteredCourse) return false

    const matchesSearch =
      cw.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cw.course_unit?.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cw.description || '').toLowerCase().includes(searchQuery.toLowerCase())

    const matchesType = typeFilter === 'all' || cw.type === typeFilter
    const matchesStatus =
      statusFilter === 'all' ||
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
          <p className="font-bold text-text-primary">{row.title}</p>
          <p className="text-xs text-text-muted mt-0.5">
            {row.course_unit?.code} - {row.course_unit?.name}
          </p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row: any) => (
        <Badge variant="secondary" dot>
          {row.type || 'coursework'}
        </Badge>
      ),
    },
    {
      key: 'work_style',
      header: 'Work Style',
      render: (row: any) => (
        <Badge variant={row.work_style === 'group_work' ? 'primary' : 'secondary'}>
          {row.work_style === 'group_work'
            ? `Group (${row.min_group_size || 1}-${row.max_group_size || 5})`
            : 'Individual'}
        </Badge>
      ),
    },
    {
      key: 'lock_status',
      header: 'Status',
      render: (row: any) => {
        if (!row.lock_at) return <Badge variant="primary">Open</Badge>
        const isLocked = new Date(row.lock_at) <= new Date()
        return isLocked ? (
          <Badge variant="danger">
            <Lock className="h-3 w-3 mr-1" /> Locked
          </Badge>
        ) : (
          <Badge variant="success">
            <Clock className="h-3 w-3 mr-1" /> Open
          </Badge>
        )
      },
    },
    {
      key: 'lock_at',
      header: 'Lock Date',
      render: (row: any) => (row.lock_at ? formatDate(row.lock_at) : 'No deadline'),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <Button variant="outline" size="sm" onClick={() => handleViewCourseworkDetails(row)}>
          View Info & Tasks
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 via-violet-500/5 to-transparent p-5 backdrop-blur-xl shadow-lg sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              <BookOpen className="h-3.5 w-3.5 text-indigo-500 animate-pulse" />
              Student Portal
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
              Coursework <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">& Assignments</span>
            </h1>
            <p className="mt-1 text-sm text-text-secondary">View and manage your coursework tasks, instructions, and deadlines.</p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <Input
                placeholder="Search coursework or instructions..."
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
        emptyMessage="No coursework found for your enrolled course units."
      />

      <CourseworkDetailModal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        coursework={selectedCoursework}
        onTasksUpdated={fetchCourseworks}
      />
    </div>
  )
}