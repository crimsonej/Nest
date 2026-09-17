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
  SlidersHorizontal,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate } from '@/lib/utils'
import { DataTable } from '../ui/DataTable'
import * as XLSX from 'xlsx'

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
  const [selectedColumnKeys, setSelectedColumnKeys] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetchOverviewData()
  }, [user])

  async function fetchOverviewData() {
    setLoading(true)
    try {
      const [studentsRes, courseUnitsRes, coursesRes, groupsRes, groupMembersRes, courseworksRes, enrollmentsRes] = await Promise.all([
        supabase.from('users').select('*').order('full_name', { ascending: true }),
        supabase.from('course_units').select('*, course:courses(code, name)').eq('is_active', true).order('name'),
        supabase.from('courses').select('*, faculty:faculties(code, name)').order('name'),
        supabase.from('groups').select('id, name, description, status, max_members, leader_id, created_at, leader:users!groups_leader_id_fkey(full_name, email), coursework:courseworks(id, title, course_unit:course_units(code, name))').order('created_at', { ascending: false }),
        supabase.from('group_members').select('id, group_id, user_id, role, joined_at, user:users(full_name, email, student_registration_number)').order('joined_at', { ascending: false }),
        supabase.from('courseworks').select('id, title, description, type, min_group_size, max_group_size, allow_self_formation, is_published, lock_at, created_at, course_unit:course_units(id, code, name)').order('created_at', { ascending: false }),
        supabase.from('student_course_units').select('id, user_id, course_unit_id, status, course_unit:course_units(code, name)').eq('status', 'active'),
      ])

      const allStudents = (studentsRes.data || []).filter(
        (student: any) => student.role === 'student' || student.status === 'normal' || student.status === 'selected_coordinator'
      )
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
        const rawCourse = (student.course || '').trim()
        const matchedCourse = allCourses.find((c: any) =>
          c.code?.toLowerCase() === rawCourse.toLowerCase() || c.name?.toLowerCase() === rawCourse.toLowerCase()
        )
        const key = matchedCourse ? `${matchedCourse.code} - ${matchedCourse.name}` : (rawCourse || 'Unassigned')
        if (!courseStudentMap.has(key)) {
          courseStudentMap.set(key, [])
        }
        courseStudentMap.get(key)!.push({
          id: student.id,
          student_name: student.full_name,
          email: student.email,
          registration_number: student.student_registration_number,
          course: key,
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
          faculty: course.faculty?.name || course.faculty?.code || 'Unassigned',
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

  useEffect(() => {
    if (selectedCategory) {
      const cols = getColumnsForCategory(selectedCategory)
      const map: Record<string, boolean> = {}
      cols.forEach((col) => (map[col.key] = true))
      setSelectedColumnKeys(map)
    }
  }, [selectedCategory])

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
        const courseName = (student.course || '').toLowerCase()
        const code = (selectedCourse.code || '').toLowerCase()
        const name = (selectedCourse.name || '').toLowerCase()
        return courseName.includes(code) || courseName.includes(name) || courseName === `${code} - ${name}`
      })
    : []

  const getActiveRows = () => {
    if (!selectedCategory) return []
    if (selectedCategory === 'groups') {
      if (selectedGroup) {
        return (selectedGroup.members || []).map((m: any) => {
          if (typeof m === 'string') {
            return {
              student_name: m,
              full_name: m,
              email: '—',
              registration_number: '—',
              name: selectedGroup.name,
              course_unit: selectedGroup.course_unit || '—',
              coursework: selectedGroup.coursework || '—',
              leader: selectedGroup.leader || '—',
              status: selectedGroup.status || '—',
            }
          }
          return m
        })
      }
      if (selectedCourseUnitId) {
        return filteredGroupsForUnit
      }
      return overviewData.groups || []
    }
    if (selectedCategory === 'course_unit_students') {
      if (selectedCourseUnitId) return selectedUnitStudents
      return overviewData.course_unit_students || []
    }
    if (selectedCategory === 'course_students') {
      if (selectedCourseId) return filteredStudentsForCourse
      return overviewData.course_students || []
    }
    return overviewData[selectedCategory] || []
  }

  const getActiveColumns = () => {
    if (!selectedCategory) return []
    let baseCols = getColumnsForCategory(selectedCategory)
    if (selectedCategory === 'groups' && selectedGroup) {
      baseCols = [
        { key: 'student_name', header: 'Student Name', value: (row) => row.student_name || row.full_name || '—' },
        { key: 'name', header: 'Group Name', value: (row) => row.name || selectedGroup.name || '—' },
        { key: 'leader', header: 'Leader', value: (row) => row.leader || selectedGroup.leader || '—' },
        { key: 'coursework', header: 'Coursework', value: (row) => row.coursework || selectedGroup.coursework || '—' },
        { key: 'course_unit', header: 'Course Unit', value: (row) => row.course_unit || selectedGroup.course_unit || '—' },
      ]
    }
    return baseCols.filter((col) => selectedColumnKeys[col.key] !== false)
  }

  const handleExportCsv = () => {
    if (!selectedCategory) return
    const columns = getActiveColumns()
    const rows = getActiveRows()

    if (rows.length === 0 || columns.length === 0) {
      alert('No matching records or columns selected for export.')
      return
    }

    const escapeValue = (value: unknown) => {
      const text = value === null || value === undefined ? '' : String(value)
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
    }

    const csvRows = [
      columns.map((col) => escapeValue(col.header)).join(','),
      ...rows.map((row: any) => columns.map((col) => escapeValue(col.value(row))).join(',')),
    ]

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${selectedCategory}_filtered_report_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleExportXlsx = () => {
    if (!selectedCategory) return
    const columns = getActiveColumns()
    const rows = getActiveRows()

    if (rows.length === 0 || columns.length === 0) {
      alert('No matching records or columns selected for export.')
      return
    }

    const worksheet = XLSX.utils.json_to_sheet(
      rows.map((row: any) => Object.fromEntries(columns.map((column) => [column.header, column.value(row)])))
    )
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Filtered Report')
    XLSX.writeFile(workbook, `${selectedCategory}_filtered_report_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const handleExportPdf = () => {
    if (!selectedCategory) return
    const columns = getActiveColumns()
    const rows = getActiveRows()

    if (rows.length === 0 || columns.length === 0) {
      alert('No matching records or columns selected for export.')
      return
    }

    const printWindow = window.open('', '_blank', 'width=1200,height=800')
    if (!printWindow) return

    const rowsHtml = rows
      .slice(0, 500)
      .map((row: any) => {
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
          <title>${selectedCategory} Filtered Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            table { border-collapse: collapse; width: 100%; margin-top: 12px; }
            th, td { font-size: 12px; }
          </style>
        </head>
        <body>
          <h2>${selectedCategory.replace(/_/g, ' ').toUpperCase()} Filtered Report</h2>
          <p style="font-size: 12px; color: #6b7280;">Exporting ${rows.length} matching records across ${columns.length} selected columns.</p>
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
        title={selectedCategory ? reportTiles.find((tile) => tile.id === selectedCategory)?.label || 'Report Details' : 'Report Details'}
        description={selectedCategory ? 'Filter records, select custom columns, and live preview before downloading' : 'Report Details'}
        size="xl"
      >
        <div className="space-y-5">
          {/* Category Specific Filters */}
          {selectedCategory === 'groups' && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Filter by Course unit</label>
                <select
                  value={selectedCourseUnitId || ''}
                  onChange={(event) => {
                    setSelectedCourseUnitId(event.target.value || null)
                    setSelectedGroupId(null)
                  }}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none"
                >
                  <option value="">All Course Units</option>
                  {courseUnitOptions.map((unit: any) => (
                    <option key={unit.id} value={unit.id}>{unit.code} - {unit.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Filter by Group</label>
                <select
                  value={selectedGroupId || ''}
                  onChange={(event) => setSelectedGroupId(event.target.value || null)}
                  disabled={!selectedCourseUnitId || filteredGroupsForUnit.length === 0}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none disabled:opacity-50"
                >
                  <option value="">All Groups in Unit</option>
                  {filteredGroupsForUnit.map((group: any) => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {selectedCategory === 'course_unit_students' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Filter by Course unit</label>
              <select
                value={selectedCourseUnitId || ''}
                onChange={(event) => setSelectedCourseUnitId(event.target.value || null)}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none"
              >
                <option value="">All Course Units</option>
                {courseUnitOptions.map((unit: any) => (
                  <option key={unit.id} value={unit.id}>{unit.code} - {unit.name}</option>
                ))}
              </select>
            </div>
          )}

          {selectedCategory === 'course_students' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Filter by Course Programme</label>
              <select
                value={selectedCourseId || ''}
                onChange={(event) => setSelectedCourseId(event.target.value || null)}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none"
              >
                <option value="">All Course Programmes</option>
                {courseOptions.map((course: any) => (
                  <option key={course.id} value={course.id}>{course.code} - {course.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Column Customizer Checklist Toolbar */}
          {selectedCategory && (
            <div className="rounded-xl border border-border bg-surface-hover/60 p-3.5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted">
                  <SlidersHorizontal className="h-4 w-4 text-primary" />
                  <span>Customize Export & Preview Columns ({getActiveColumns().length} / {getColumnsForCategory(selectedCategory).length} Included)</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => {
                      const allCols = getColumnsForCategory(selectedCategory)
                      const map: Record<string, boolean> = {}
                      allCols.forEach((c) => (map[c.key] = true))
                      setSelectedColumnKeys(map)
                    }}
                    className="text-primary hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-text-muted">•</span>
                  <button
                    type="button"
                    onClick={() => setSelectedColumnKeys({})}
                    className="text-text-muted hover:underline"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                {getColumnsForCategory(selectedCategory).map((col) => {
                  const isChecked = selectedColumnKeys[col.key] !== false
                  return (
                    <label
                      key={col.key}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg border px-2.5 py-1 cursor-pointer transition-colors select-none',
                        isChecked ? 'border-primary/40 bg-primary/10 text-primary font-semibold' : 'border-border bg-surface text-text-muted'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => setSelectedColumnKeys((prev) => ({ ...prev, [col.key]: e.target.checked }))}
                        className="h-3.5 w-3.5 rounded border-border text-primary"
                      />
                      <span>{col.header}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {/* Export Action Bar & Record Counter */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-y border-border py-3">
            <div className="flex items-center gap-2">
              <Badge variant="primary" className="font-mono text-xs">
                {getActiveRows().length} {getActiveRows().length === 1 ? 'Record' : 'Records'}
              </Badge>
              <span className="text-xs text-text-muted">matching active filter criteria</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                disabled={getActiveRows().length === 0 || getActiveColumns().length === 0}
              >
                <Download className="h-4 w-4 mr-1.5 text-emerald-600" />
                Download CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportXlsx}
                disabled={getActiveRows().length === 0 || getActiveColumns().length === 0}
              >
                <Download className="h-4 w-4 mr-1.5 text-blue-600" />
                Download Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPdf}
                disabled={getActiveRows().length === 0 || getActiveColumns().length === 0}
              >
                <FileText className="h-4 w-4 mr-1.5 text-rose-600" />
                Export PDF
              </Button>
            </div>
          </div>

          {/* Live Preview Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">Live Export Preview</h4>
            {getActiveRows().length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-surface-hover/30 p-8 text-center text-sm text-text-muted">
                No matching records found for the selected filter criteria.
              </div>
            ) : getActiveColumns().length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-surface-hover/30 p-8 text-center text-sm text-text-muted">
                Please check at least one column above to display in the export preview.
              </div>
            ) : (
              <DataTable
                columns={getActiveColumns().map((col) => ({
                  key: col.key,
                  header: col.header,
                  render: (row: any) => <span className="whitespace-nowrap">{col.value(row)}</span>,
                }))}
                data={getActiveRows()}
                keyExtractor={(row: any) => row.id || row.student_name || row.full_name || row.name || row.title || row.code || String(Math.random())}
                emptyMessage="No records available"
              />
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}