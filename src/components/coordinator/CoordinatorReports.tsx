'use client'

import { useState, useEffect } from 'react'
import {
  Download,
  FileText,
  FolderOpen,
  Grid3X3,
  List,
  Users,
  UserX,
  BookOpen,
  NotebookText,
  ClipboardList,
  GraduationCap,
  Layers3,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { DataTable } from '../ui/DataTable'

type ReportCategory =
  | 'students'
  | 'orphan_students'
  | 'groups'
  | 'course_units'
  | 'courses'
  | 'coursework'
  | 'course_unit_students'
  | 'course_students'

type ReportColumn = {
  key: string
  header: string
  value: (row: any) => string
}

const reportTiles = [
  { id: 'students', label: 'General student list', description: 'All active student records', icon: Users, color: 'from-blue-500 to-cyan-500' },
  { id: 'orphan_students', label: 'Orphan list', description: 'Students not assigned to a group', icon: UserX, color: 'from-amber-500 to-orange-500' },
  { id: 'groups', label: 'Group list', description: 'All groups with member rosters', icon: Layers3, color: 'from-violet-500 to-purple-500' },
  { id: 'course_units', label: 'Course units', description: 'Unit roster and structure', icon: BookOpen, color: 'from-emerald-500 to-teal-500' },
  { id: 'courses', label: 'Courses', description: 'Faculty-wide programme list', icon: GraduationCap, color: 'from-pink-500 to-rose-500' },
  { id: 'coursework', label: 'Coursework', description: 'Assignments, projects and presentations', icon: NotebookText, color: 'from-sky-500 to-indigo-500' },
  { id: 'course_unit_students', label: 'Students per course unit', description: 'Roster by unit', icon: FolderOpen, color: 'from-green-500 to-emerald-500' },
  { id: 'course_students', label: 'Students per course', description: 'Roster by programme', icon: Grid3X3, color: 'from-cyan-500 to-blue-500' },
] as const

export function CoordinatorReports() {
  const { user } = useAuth()
  const supabase = createClient()
  const [viewMode, setViewMode] = useState<'tiles' | 'list'>('tiles')
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | null>(null)
  const [selectedCourseUnitId, setSelectedCourseUnitId] = useState<string | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [overviewData, setOverviewData] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOverviewData()
  }, [user])

  async function fetchOverviewData() {
    setLoading(true)
    try {
      const [studentsRes, courseUnitsRes, coursesRes, groupsRes, groupMembersRes, courseworksRes, enrollmentsRes] = await Promise.all([
        supabase.from('users').select('*').order('full_name', { ascending: true }),
        supabase.from('course_units').select('*, course:courses(code, name)').eq('is_active', true).order('name'),
        supabase.from('courses').select('*').order('name'),
        supabase.from('groups').select('id, name, description, status, max_members, leader_id, created_at, leader:users!groups_leader_id_fkey(full_name, email), coursework:courseworks(id, title, course_unit:course_units(code, name))').order('created_at', { ascending: false }),
        supabase.from('group_members').select('id, group_id, user_id, role, joined_at, user:users(full_name, email, student_registration_number)').order('joined_at', { ascending: false }),
        supabase.from('courseworks').select('id, title, description, type, min_group_size, max_group_size, allow_self_formation, is_published, lock_at, created_at, course_unit:course_units(id, code, name)').order('created_at', { ascending: false }),
        supabase.from('student_course_units').select('id, user_id, course_unit_id, status, course_unit:course_units(code, name)').eq('status', 'active'),
      ])

      const allStudents = (studentsRes.data || []).filter((student: any) => student.role === 'student')
      const allGroups = groupsRes.data || []
      const allMembers = groupMembersRes.data || []
      const allCourseUnits = courseUnitsRes.data || []
      const allCourses = coursesRes.data || []
      const allCourseworks = courseworksRes.data || []
      const allEnrollments = enrollmentsRes.data || []

      const memberUserIds = new Set(allMembers.map((member: any) => member.user_id))
      const orphanStudents = allStudents.filter((student: any) => !memberUserIds.has(student.id))

      const courseStudentMap = new Map<string, any[]>()
      allStudents.forEach((student: any) => {
        const courseName = student.course || 'Unassigned'
        if (!courseStudentMap.has(courseName)) {
          courseStudentMap.set(courseName, [])
        }
        courseStudentMap.get(courseName)!.push({
          id: student.id,
          student_name: student.full_name,
          email: student.email,
          registration_number: student.student_registration_number,
          course: courseName,
        })
      })

      const courseUnitStudentMap = new Map<string, any[]>()
      allEnrollments.forEach((enrollment: any) => {
        const unit = allCourseUnits.find((item: any) => item.id === enrollment.course_unit_id)
        const student = allStudents.find((item: any) => item.id === enrollment.user_id)
        if (!unit || !student) return

        const key = `${unit.code} - ${unit.name}`
        if (!courseUnitStudentMap.has(key)) {
          courseUnitStudentMap.set(key, [])
        }

        courseUnitStudentMap.get(key)!.push({
          id: student.id,
          student_name: student.full_name,
          email: student.email,
          registration_number: student.student_registration_number,
          course_unit: key,
          course: student.course || 'Unassigned',
        })
      })

      const datasetMap: Record<string, any[]> = {
        students: allStudents.map((student: any) => ({
          id: student.id,
          full_name: student.full_name,
          email: student.email,
          student_registration_number: student.student_registration_number,
          course: student.course || 'Unassigned',
          whatsapp_phone: student.whatsapp_phone || '—',
          created_at: student.created_at,
        })),
        orphan_students: orphanStudents.map((student: any) => ({
          id: student.id,
          full_name: student.full_name,
          email: student.email,
          student_registration_number: student.student_registration_number,
          course: student.course || 'Unassigned',
          whatsapp_phone: student.whatsapp_phone || '—',
          created_at: student.created_at,
        })),
        groups: allGroups.map((group: any) => {
          const members = (allMembers || [])
            .filter((member: any) => member.group_id === group.id)
            .map((member: any) => member.user?.full_name || 'Student')

          return {
            id: group.id,
            name: group.name,
            description: group.description || '—',
            status: group.status,
            max_members: group.max_members,
            leader: group.leader?.full_name || 'Unassigned',
            coursework: group.coursework?.title || '—',
            course_unit_id: group.coursework?.course_unit_id || group.coursework?.course_unit?.id || null,
            course_unit: group.coursework?.course_unit?.code || '—',
            course_unit_name: group.coursework?.course_unit?.name || '—',
            members,
            member_count: members.length,
            created_at: group.created_at,
          }
        }),
        course_units: allCourseUnits.map((unit: any) => ({
          id: unit.id,
          code: unit.code,
          name: unit.name,
          course: unit.course?.code || '—',
          course_name: unit.course?.name || '—',
          coordinator: unit.coordinator_id || '—',
          max_group_size: unit.max_group_size,
          min_group_size: unit.min_group_size,
          created_at: unit.created_at,
        })),
        courses: allCourses.map((course: any) => ({
          id: course.id,
          code: course.code,
          name: course.name,
          description: course.description || '—',
          faculty: course.faculty_id || '—',
          is_active: course.is_active ? 'Active' : 'Inactive',
          created_at: course.created_at,
        })),
        coursework: allCourseworks.map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.description || '—',
          type: item.type,
          course_unit: item.course_unit?.code || '—',
          course_unit_name: item.course_unit?.name || '—',
          min_group_size: item.min_group_size,
          max_group_size: item.max_group_size,
          self_formation: item.allow_self_formation ? 'Yes' : 'No',
          status: item.is_published ? 'Published' : 'Draft',
          lock_at: item.lock_at,
          created_at: item.created_at,
        })),
        course_unit_students: Array.from(courseUnitStudentMap.entries()).flatMap(([unitKey, students]) =>
          students.map((student: any) => ({
            ...student,
            course_unit: unitKey,
          }))
        ),
        course_students: Array.from(courseStudentMap.entries()).flatMap(([courseName, students]) =>
          students.map((student: any) => ({
            ...student,
            course: courseName,
          }))
        ),
      }

      setOverviewData(datasetMap)
    } catch (error) {
      console.error('Error loading report overview data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getColumnsForCategory = (category: ReportCategory): ReportColumn[] => {
    switch (category) {
      case 'students':
      case 'orphan_students':
        return [
          { key: 'full_name', header: 'Student', value: (row) => row.full_name || '—' },
          { key: 'email', header: 'Email', value: (row) => row.email || '—' },
          { key: 'student_registration_number', header: 'Reg No.', value: (row) => row.student_registration_number || '—' },
          { key: 'course', header: 'Course', value: (row) => row.course || '—' },
          { key: 'whatsapp_phone', header: 'WhatsApp', value: (row) => row.whatsapp_phone || '—' },
          { key: 'created_at', header: 'Registered', value: (row) => formatDate(row.created_at) },
        ]
      case 'groups':
        return [
          { key: 'name', header: 'Group', value: (row) => row.name || '—' },
          { key: 'course_unit', header: 'Course Unit', value: (row) => row.course_unit || '—' },
          { key: 'coursework', header: 'Coursework', value: (row) => row.coursework || '—' },
          { key: 'leader', header: 'Leader', value: (row) => row.leader || '—' },
          { key: 'status', header: 'Status', value: (row) => row.status || '—' },
          { key: 'members', header: 'Students in group', value: (row) => (row.members && row.members.length > 0 ? row.members.join(', ') : 'No members yet') },
          { key: 'max_members', header: 'Max', value: (row) => String(row.max_members || 0) },
          { key: 'created_at', header: 'Created', value: (row) => formatDate(row.created_at) },
        ]
      case 'course_units':
        return [
          { key: 'code', header: 'Code', value: (row) => row.code || '—' },
          { key: 'name', header: 'Name', value: (row) => row.name || '—' },
          { key: 'course', header: 'Course', value: (row) => row.course || '—' },
          { key: 'course_name', header: 'Course Name', value: (row) => row.course_name || '—' },
          { key: 'max_group_size', header: 'Max Group', value: (row) => String(row.max_group_size || 0) },
          { key: 'min_group_size', header: 'Min Group', value: (row) => String(row.min_group_size || 0) },
        ]
      case 'courses':
        return [
          { key: 'code', header: 'Code', value: (row) => row.code || '—' },
          { key: 'name', header: 'Name', value: (row) => row.name || '—' },
          { key: 'description', header: 'Description', value: (row) => row.description || '—' },
          { key: 'faculty', header: 'Faculty', value: (row) => row.faculty || '—' },
          { key: 'is_active', header: 'Status', value: (row) => row.is_active || '—' },
        ]
      case 'coursework':
        return [
          { key: 'title', header: 'Title', value: (row) => row.title || '—' },
          { key: 'course_unit', header: 'Course Unit', value: (row) => row.course_unit || '—' },
          { key: 'type', header: 'Type', value: (row) => row.type || '—' },
          { key: 'status', header: 'Status', value: (row) => row.status || '—' },
          { key: 'self_formation', header: 'Self Formation', value: (row) => row.self_formation || '—' },
          { key: 'group_size', header: 'Group Size', value: (row) => `${row.min_group_size || 0}-${row.max_group_size || 0}` },
          { key: 'lock_at', header: 'Lock Date', value: (row) => (row.lock_at ? formatDate(row.lock_at) : '—') },
        ]
      case 'course_unit_students':
      case 'course_students':
        return [
          { key: 'student_name', header: 'Student', value: (row) => row.student_name || '—' },
          { key: 'registration_number', header: 'Reg No.', value: (row) => row.registration_number || '—' },
          { key: 'email', header: 'Email', value: (row) => row.email || '—' },
          { key: 'course_unit', header: 'Course Unit', value: (row) => row.course_unit || '—' },
          { key: 'course', header: 'Course', value: (row) => row.course || '—' },
        ]
      default:
        return []
    }
  }

  const selectedDataset = selectedCategory ? overviewData[selectedCategory] || [] : []
  const tableColumns = selectedCategory ? getColumnsForCategory(selectedCategory).map((column) => ({
    key: column.key,
    header: column.header,
    render: (row: any) => <span className="whitespace-nowrap">{column.value(row)}</span>,
  })) : []

  const handleExportCsv = () => {
    if (!selectedCategory) return

    const columns = getColumnsForCategory(selectedCategory)
    const rows = overviewData[selectedCategory] || []

    if (rows.length === 0) return

    const escapeValue = (value: unknown) => {
      const text = value === null || value === undefined ? '' : String(value)
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
    }

    const csvRows = [
      columns.map((col) => escapeValue(col.header)).join(','),
      ...rows.map((row) => columns.map((col) => escapeValue(col.value(row))).join(',')),
    ]

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${selectedCategory}-overview-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleExportPdf = () => {
    if (!selectedCategory) return

    const columns = getColumnsForCategory(selectedCategory)
    const rows = overviewData[selectedCategory] || []

    if (rows.length === 0) return

    const printWindow = window.open('', '_blank', 'width=1200,height=800')
    if (!printWindow) return

    const rowsHtml = rows
      .slice(0, 250)
      .map((row) => {
        const cells = columns
          .map((column) => `<td style="border:1px solid #d1d5db; padding:8px; text-align:left;">${column.value(row)}</td>`)
          .join('')
        return `<tr>${cells}</tr>`
      })
      .join('')

    const headerHtml = columns
      .map((column) => `<th style="border:1px solid #d1d5db; padding:8px; text-align:left; background:#f3f4f6; font-weight:600;">${column.header}</th>`)
      .join('')

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${selectedCategory} overview</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            table { border-collapse: collapse; width: 100%; }
            th, td { font-size: 12px; }
          </style>
        </head>
        <body>
          <h2>${selectedCategory.replace('_', ' ')} overview</h2>
          <table>
            <thead><tr>${headerHtml}</tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  const courseUnitOptions = overviewData.course_units || []
  const courseOptions = overviewData.courses || []
  const filteredGroupsForUnit = selectedCourseUnitId
    ? (overviewData.groups || []).filter((group: any) => group.course_unit_id === selectedCourseUnitId)
    : []
  const selectedGroup = filteredGroupsForUnit.find((group: any) => group.id === selectedGroupId) || null
  const selectedUnitStudents = selectedCourseUnitId
    ? (overviewData.course_unit_students || []).filter((student: any) => {
        const unitName = student.course_unit || ''
        const selectedUnit = courseUnitOptions.find((unit: any) => unit.id === selectedCourseUnitId)
        return selectedUnit ? unitName.includes(selectedUnit.code || '') || unitName === `${selectedUnit.code} - ${selectedUnit.name}` : true
      })
    : []
  const selectedCourse = courseOptions.find((course: any) => course.id === selectedCourseId) || null
  const filteredStudentsForCourse = selectedCourse
    ? (overviewData.course_students || []).filter((student: any) => {
        const courseName = student.course || ''
        return courseName === selectedCourse.code || courseName === selectedCourse.name || courseName.includes(selectedCourse.code || '')
      })
    : []

  const renderTile = (tile: (typeof reportTiles)[number]) => {
    const Icon = tile.icon
    const count = overviewData[tile.id]?.length || 0

    return (
      <button
        key={tile.id}
        type="button"
        onClick={() => {
          setSelectedCategory(tile.id as ReportCategory)
          if (tile.id === 'groups' || tile.id === 'course_unit_students' || tile.id === 'course_students') {
            setSelectedCourseUnitId(null)
            setSelectedGroupId(null)
            setSelectedCourseId(null)
          }
        }}
        className="w-full text-left"
      >
        <Card
          hover
          className={`h-full overflow-hidden border border-border bg-gradient-to-br ${tile.color} p-[1px]`}
        >
          <div className="h-full rounded-xl bg-surface p-5">
            <div className="flex items-start justify-between gap-3">
              <div className={`rounded-lg bg-gradient-to-br ${tile.color} p-3 text-white shadow-sm`}>
                <Icon className="h-5 w-5" />
              </div>
              <Badge variant="secondary">{count}</Badge>
            </div>

            <div className="mt-5 space-y-2">
              <h3 className="text-base font-semibold text-text-primary">{tile.label}</h3>
              <p className="text-sm text-text-secondary">{tile.description}</p>
            </div>

            <div className="mt-5 flex items-center justify-between text-sm text-primary font-medium">
              <span>Open list</span>
              <span>→</span>
            </div>
          </div>
        </Card>
      </button>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Reports overview</h1>
          <p className="text-text-secondary">Browse every database list from students and groups to course rosters and orphan records.</p>
        </div>

        <div className="inline-flex rounded-lg border border-border bg-surface p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setViewMode('tiles')}
            className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm ${viewMode === 'tiles' ? 'bg-primary text-white' : 'text-text-secondary'}`}
          >
            <Grid3X3 className="h-4 w-4" />
            Tiles
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm ${viewMode === 'list' ? 'bg-primary text-white' : 'text-text-secondary'}`}
          >
            <List className="h-4 w-4" />
            List
          </button>
        </div>
      </div>

      {!loading && (
        <div className="rounded-xl border border-dashed border-border bg-surface-hover/40 px-4 py-3 text-sm text-text-secondary">
          Select a list to open the records and export them as CSV or PDF.
        </div>
      )}

      {loading ? (
        <Card>
          <CardContent className="space-y-3 py-6">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-12 animate-pulse rounded-lg bg-secondary/10" />
            ))}
          </CardContent>
        </Card>
      ) : (
        <>
          {viewMode === 'tiles' ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {reportTiles.map(renderTile)}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {reportTiles.map((tile) => {
                    const count = overviewData[tile.id]?.length || 0
                    return (
                      <button
                        key={tile.id}
                        type="button"
                        onClick={() => setSelectedCategory(tile.id as ReportCategory)}
                        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-hover"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`rounded-lg bg-gradient-to-br ${tile.color} p-2 text-white`}>
                            <tile.icon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium text-text-primary">{tile.label}</div>
                            <div className="text-sm text-text-secondary">{tile.description}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium uppercase tracking-wide text-text-muted">Open</span>
                          <Badge variant="primary">{count}</Badge>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Modal
        isOpen={Boolean(selectedCategory)}
        onClose={() => {
          setSelectedCategory(null)
          setSelectedCourseUnitId(null)
          setSelectedGroupId(null)
          setSelectedCourseId(null)
        }}
        title={selectedCategory ? reportTiles.find((tile) => tile.id === selectedCategory)?.label || 'List details' : 'List details'}
        description={selectedCategory ? `${selectedDataset.length} records in this list` : 'Database list details'}
        size="xl"
      >
        {selectedCategory === 'groups' ? (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Course unit</label>
                <select
                  value={selectedCourseUnitId || ''}
                  onChange={(event) => {
                    setSelectedCourseUnitId(event.target.value || null)
                    setSelectedGroupId(null)
                  }}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select a course unit</option>
                  {courseUnitOptions.map((unit: any) => (
                    <option key={unit.id} value={unit.id}>{unit.code} - {unit.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Group</label>
                <select
                  value={selectedGroupId || ''}
                  onChange={(event) => setSelectedGroupId(event.target.value || null)}
                  disabled={!selectedCourseUnitId || filteredGroupsForUnit.length === 0}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select a group</option>
                  {filteredGroupsForUnit.map((group: any) => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedCourseUnitId && (
              <div className="rounded-xl border border-border bg-surface-hover/30 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] text-text-muted">Course unit</p>
                    <h3 className="text-base font-semibold text-text-primary">
                      {courseUnitOptions.find((unit: any) => unit.id === selectedCourseUnitId)?.code || 'Selected'}
                      {' - '}
                      {courseUnitOptions.find((unit: any) => unit.id === selectedCourseUnitId)?.name || 'Course unit'}
                    </h3>
                  </div>
                  <Badge variant="secondary">{filteredGroupsForUnit.length} groups</Badge>
                </div>

                <div className="space-y-3">
                  {filteredGroupsForUnit.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-text-secondary">
                      No groups found for this course unit.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredGroupsForUnit.map((group: any) => (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => setSelectedGroupId(group.id)}
                          className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${selectedGroupId === group.id ? 'border-primary bg-primary/5' : 'border-border bg-surface hover:bg-surface-hover'}`}
                        >
                          <span className="font-medium text-text-primary">{group.name}</span>
                          <span className="text-sm text-text-secondary">{group.members?.length || 0} students</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-lg font-semibold text-text-primary">
                  {selectedGroup ? `Students in ${selectedGroup.name}` : selectedCourseUnitId ? 'Students in this course unit' : 'Student list'}
                </h4>
                <Button variant="outline" onClick={handleExportCsv} disabled={selectedDataset.length === 0}>
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>

              {selectedGroup ? (
                selectedGroup.members?.length ? (
                  <DataTable
                    columns={[
                      { key: 'full_name', header: 'Student', render: (row: any) => <span>{row.full_name || '—'}</span> },
                      { key: 'email', header: 'Email', render: (row: any) => <span>{row.email || '—'}</span> },
                      { key: 'student_registration_number', header: 'Reg No.', render: (row: any) => <span>{row.student_registration_number || '—'}</span> },
                    ]}
                    data={selectedGroup.members.map((member: string) => ({ full_name: member, email: '—', student_registration_number: '—' }))}
                    keyExtractor={(row: any) => `${row.full_name || 'student'}-${row.email || 'no-email'}-${row.student_registration_number || 'no-reg'}`}
                    emptyMessage="No students in this group"
                  />
                ) : (
                  <div className="rounded-lg border border-dashed border-border bg-surface-hover/30 p-6 text-center text-text-secondary">
                    No students assigned to this group yet.
                  </div>
                )
              ) : selectedCourseUnitId ? (
                selectedUnitStudents.length ? (
                  <DataTable
                    columns={[
                      { key: 'student_name', header: 'Student', render: (row: any) => <span>{row.student_name || '—'}</span> },
                      { key: 'email', header: 'Email', render: (row: any) => <span>{row.email || '—'}</span> },
                      { key: 'registration_number', header: 'Reg No.', render: (row: any) => <span>{row.registration_number || '—'}</span> },
                    ]}
                    data={selectedUnitStudents}
                    keyExtractor={(row) => row.id || `${row.student_name}-${Math.random()}`}
                    emptyMessage="No students in this course unit"
                  />
                ) : (
                  <div className="rounded-lg border border-dashed border-border bg-surface-hover/30 p-6 text-center text-text-secondary">
                    No students assigned to this course unit.
                  </div>
                )
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-surface-hover/30 p-6 text-center text-text-secondary">
                  Select a course unit to view its student roster.
                </div>
              )}
            </div>
          </div>
        ) : selectedCategory === 'course_unit_students' ? (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Course unit</label>
              <select
                value={selectedCourseUnitId || ''}
                onChange={(event) => setSelectedCourseUnitId(event.target.value || null)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select a course unit</option>
                {courseUnitOptions.map((unit: any) => (
                  <option key={unit.id} value={unit.id}>{unit.code} - {unit.name}</option>
                ))}
              </select>
            </div>

            {selectedCourseUnitId && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-lg font-semibold text-text-primary">
                    Students in {courseUnitOptions.find((unit: any) => unit.id === selectedCourseUnitId)?.code || 'selected unit'}
                  </h4>
                  <Button variant="outline" onClick={handleExportCsv} disabled={selectedUnitStudents.length === 0}>
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                </div>

                {selectedUnitStudents.length ? (
                  <DataTable
                    columns={[
                      { key: 'student_name', header: 'Student', render: (row: any) => <span>{row.student_name || '—'}</span> },
                      { key: 'email', header: 'Email', render: (row: any) => <span>{row.email || '—'}</span> },
                      { key: 'registration_number', header: 'Reg No.', render: (row: any) => <span>{row.registration_number || '—'}</span> },
                    ]}
                    data={selectedUnitStudents}
                    keyExtractor={(row: any) => row.id || `${row.student_name}-${row.registration_number || 'no-reg'}`}
                    emptyMessage="No students in this course unit"
                  />
                ) : (
                  <div className="rounded-lg border border-dashed border-border bg-surface-hover/30 p-6 text-center text-text-secondary">
                    No students assigned to this course unit.
                  </div>
                )}
              </div>
            )}
          </div>
        ) : selectedCategory === 'course_students' ? (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Course</label>
              <select
                value={selectedCourseId || ''}
                onChange={(event) => setSelectedCourseId(event.target.value || null)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select a course</option>
                {courseOptions.map((course: any) => (
                  <option key={course.id} value={course.id}>{course.code} - {course.name}</option>
                ))}
              </select>
            </div>

            {selectedCourseId && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-lg font-semibold text-text-primary">
                    Students in {selectedCourse?.code || 'selected course'}
                  </h4>
                  <Button variant="outline" onClick={handleExportCsv} disabled={filteredStudentsForCourse.length === 0}>
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                </div>

                {filteredStudentsForCourse.length ? (
                  <DataTable
                    columns={[
                      { key: 'student_name', header: 'Student', render: (row: any) => <span>{row.student_name || '—'}</span> },
                      { key: 'email', header: 'Email', render: (row: any) => <span>{row.email || '—'}</span> },
                      { key: 'registration_number', header: 'Reg No.', render: (row: any) => <span>{row.registration_number || '—'}</span> },
                      { key: 'course', header: 'Course', render: (row: any) => <span>{row.course || '—'}</span> },
                    ]}
                    data={filteredStudentsForCourse}
                    keyExtractor={(row: any) => row.id || `${row.student_name}-${row.registration_number || 'no-reg'}`}
                    emptyMessage="No students in this course"
                  />
                ) : (
                  <div className="rounded-lg border border-dashed border-border bg-surface-hover/30 p-6 text-center text-text-secondary">
                    No students assigned to this course.
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button variant="outline" onClick={handleExportCsv} disabled={selectedDataset.length === 0}>
                <Download className="h-4 w-4" />
                Download CSV
              </Button>
              <Button variant="outline" onClick={handleExportPdf} disabled={selectedDataset.length === 0}>
                <FileText className="h-4 w-4" />
                Export PDF
              </Button>
            </div>

            {selectedDataset.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-surface-hover/30 p-6 text-center text-text-secondary">
                No records in this dataset.
              </div>
            ) : (
              <DataTable
                columns={tableColumns}
                data={selectedDataset}
                keyExtractor={(row) => row.id || `${row.full_name || row.name || row.title}-${Math.random()}`}
                emptyMessage="No records available"
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}