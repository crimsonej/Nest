'use client'

import { useState, useEffect, useMemo } from 'react'
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
  Search,
  Maximize2,
  Minimize2,
  Table,
  LayoutGrid,
  ListFilter,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Layers,
  Sparkles,
  UserCheck,
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

const compareGroupNames = (firstName: string = '', secondName: string = '') =>
  firstName.localeCompare(secondName, undefined, { numeric: true, sensitivity: 'base' })

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

type ModalLayoutMode = 'table' | 'cards' | 'roster' | 'accordion'

const reportTiles = [
  { id: 'students', label: 'General student list', description: 'All active student records', icon: Users, color: 'from-blue-500 to-cyan-500', showCount: true },
  { id: 'orphan_students', label: 'Orphan list', description: 'Students not assigned to a group', icon: UserX, color: 'from-amber-500 to-orange-500', showCount: true },
  { id: 'groups', label: 'Group list', description: 'All groups with member rosters', icon: Layers3, color: 'from-violet-500 to-purple-500', showCount: true },
  { id: 'course_units', label: 'Course units', description: 'Unit roster and structure', icon: BookOpen, color: 'from-emerald-500 to-teal-500', showCount: true },
  { id: 'courses', label: 'Courses', description: 'Faculty-wide programme list', icon: GraduationCap, color: 'from-pink-500 to-rose-500', showCount: true },
  { id: 'coursework', label: 'Coursework', description: 'Assignments, projects and presentations', icon: NotebookText, color: 'from-sky-500 to-indigo-500', showCount: true },
  { id: 'course_unit_students', label: 'Students per course unit', description: 'Roster by unit', icon: FolderOpen, color: 'from-green-500 to-emerald-500', showCount: false },
  { id: 'course_students', label: 'Students per course', description: 'Roster by programme', icon: Grid3X3, color: 'from-cyan-500 to-blue-500', showCount: false },
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

  // Modal Layout & Controls State
  const [modalLayoutMode, setModalLayoutMode] = useState<ModalLayoutMode>('table')
  const [inModalSearch, setInModalSearch] = useState('')
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({})

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
        supabase.from('groups').select('id, name, description, status, max_members, leader_id, created_at, leader:users!groups_leader_id_fkey(full_name, email), coursework:courseworks(id, title, course_unit_id, course_unit:course_units(id, code, name))').order('created_at', { ascending: false }),
        supabase.from('group_members').select('id, group_id, user_id, role, joined_at, user:users(full_name, email, student_registration_number, whatsapp_phone, course, gender)').order('joined_at', { ascending: false }),
        supabase.from('courseworks').select('id, title, description, type, min_group_size, max_group_size, allow_self_formation, is_published, lock_at, created_at, course_unit_id, course_unit:course_units(id, code, name)').order('created_at', { ascending: false }),
        supabase.from('student_course_units').select('id, user_id, course_unit_id, status, course_unit:course_units(code, name)').eq('status', 'active'),
      ])

      const rawUsers = studentsRes.data || []
      const allStudents = rawUsers.filter((student: any) => {
        if (student.role === 'admin' || student.role === 'coordinator') {
          return student.status === 'selected_coordinator' || Boolean(student.student_registration_number)
        }
        return true
      })

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
          c.code?.toLowerCase() === rawCourse.toLowerCase() ||
          c.name?.toLowerCase() === rawCourse.toLowerCase() ||
          rawCourse.toLowerCase().includes((c.code || '').toLowerCase())
        )
        const key = matchedCourse ? `${matchedCourse.code} - ${matchedCourse.name}` : (rawCourse || 'Unassigned')
        if (!courseStudentMap.has(key)) {
          courseStudentMap.set(key, [])
        }
        courseStudentMap.get(key)!.push({
          id: student.id,
          course_id: matchedCourse?.id || null,
          student_name: student.full_name,
          email: student.email,
          registration_number: student.student_registration_number,
          course: key,
          gender: student.gender || '—',
          whatsapp_phone: student.whatsapp_phone || '—',
        })
      })

      const courseUnitStudentMap = new Map<string, any[]>()
      const courseUnitStudentIds = new Map<string, Set<string>>()
      allEnrollments.forEach((enrollment: any) => {
        const unit = allCourseUnits.find((item: any) => item.id === enrollment.course_unit_id)
        const student = rawUsers.find((item: any) => item.id === enrollment.user_id)
        if (!unit || !student) return

        const key = `${unit.code} - ${unit.name}`
        if (!courseUnitStudentMap.has(key)) {
          courseUnitStudentMap.set(key, [])
          courseUnitStudentIds.set(key, new Set())
        }
        const studentIds = courseUnitStudentIds.get(key)!
        if (studentIds.has(student.id)) return
        studentIds.add(student.id)

        courseUnitStudentMap.get(key)!.push({
          id: student.id,
          course_unit_id: unit.id,
          student_name: student.full_name,
          email: student.email,
          registration_number: student.student_registration_number,
          course_unit: key,
          course: student.course || 'Unassigned',
          gender: student.gender || '—',
          whatsapp_phone: student.whatsapp_phone || '—',
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
          gender: student.gender || '—',
          created_at: student.created_at,
        })),
        orphan_students: orphanStudents.map((student: any) => ({
          id: student.id,
          full_name: student.full_name,
          email: student.email,
          student_registration_number: student.student_registration_number,
          course: student.course || 'Unassigned',
          whatsapp_phone: student.whatsapp_phone || '—',
          gender: student.gender || '—',
          created_at: student.created_at,
        })),
        groups: allGroups.map((group: any) => {
          const unitId = group.coursework?.course_unit_id || group.coursework?.course_unit?.id || null
          const members = (allMembers || [])
            .filter((member: any) => member.group_id === group.id)
            .map((member: any) => ({
              id: member.user_id,
              student_name: member.user?.full_name || 'Student',
              registration_number: member.user?.student_registration_number || '—',
              email: member.user?.email || '—',
              whatsapp_phone: member.user?.whatsapp_phone || '—',
              course: member.user?.course || '—',
              gender: member.user?.gender || '—',
              role: member.role,
            }))

          return {
            id: group.id,
            name: group.name,
            description: group.description || '—',
            status: group.status,
            max_members: group.max_members,
            leader: group.leader?.full_name || 'Unassigned',
            coursework: group.coursework?.title || '—',
            course_unit_id: unitId,
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
          course_unit_id: item.course_unit_id || item.course_unit?.id || null,
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
          { key: 'gender', header: 'Gender', value: (row) => row.gender || '—' },
          { key: 'created_at', header: 'Registered', value: (row) => formatDate(row.created_at) },
        ]
      case 'groups':
        return [
          { key: 'name', header: 'Group', value: (row) => row.name || '—' },
          { key: 'course_unit', header: 'Course Unit', value: (row) => row.course_unit || '—' },
          { key: 'course_unit_name', header: 'Course Unit Name', value: (row) => row.course_unit_name || '—' },
          { key: 'coursework', header: 'Coursework', value: (row) => row.coursework || '—' },
          { key: 'leader', header: 'Leader', value: (row) => row.leader || '—' },
          { key: 'status', header: 'Status', value: (row) => row.status || '—' },
          { key: 'student_name', header: 'Student Name', value: (row) => row.student_name || '—' },
          { key: 'registration_number', header: 'Reg No.', value: (row) => row.registration_number || '—' },
          { key: 'email', header: 'Email', value: (row) => row.email || '—' },
          { key: 'whatsapp_phone', header: 'WhatsApp', value: (row) => row.whatsapp_phone || '—' },
          { key: 'course', header: 'Course', value: (row) => row.course || '—' },
          { key: 'gender', header: 'Gender', value: (row) => row.gender || '—' },
          { key: 'members', header: 'Students in group', value: (row) => (row.members && row.members.length > 0 ? row.members.map((member: any) => member.student_name || member).join(', ') : 'No members yet') },
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
          { key: 'whatsapp_phone', header: 'WhatsApp', value: (row) => row.whatsapp_phone || '—' },
          { key: 'gender', header: 'Gender', value: (row) => row.gender || '—' },
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
      setInModalSearch('')
      setSortColumn(null)
      setSortOrder('asc')
    }
  }, [selectedCategory])

  const courseUnitOptions = overviewData.course_units || []
  const courseOptions = overviewData.courses || []
  const filteredGroupsForUnit = selectedCourseUnitId
    ? (overviewData.groups || [])
      .filter((group: any) => group.course_unit_id === selectedCourseUnitId || !selectedCourseUnitId)
      .sort((firstGroup: any, secondGroup: any) => compareGroupNames(firstGroup.name, secondGroup.name))
    : (overviewData.groups || []).sort((firstGroup: any, secondGroup: any) => compareGroupNames(firstGroup.name, secondGroup.name))
  const selectedGroup = filteredGroupsForUnit.find((group: any) => group.id === selectedGroupId) || null
  
  const selectedUnitStudents = selectedCourseUnitId
    ? (overviewData.course_unit_students || []).filter((student: any) => {
        if (student.course_unit_id && student.course_unit_id === selectedCourseUnitId) return true
        const unitName = student.course_unit || ''
        const selectedUnit = courseUnitOptions.find((unit: any) => unit.id === selectedCourseUnitId)
        return selectedUnit ? unitName.includes(selectedUnit.code || '') || unitName === `${selectedUnit.code} - ${selectedUnit.name}` : true
      })
    : (overviewData.course_unit_students || [])

  const selectedCourse = courseOptions.find((course: any) => course.id === selectedCourseId) || null
  const filteredStudentsForCourse = selectedCourse
    ? (overviewData.course_students || []).filter((student: any) => {
        if (student.course_id && student.course_id === selectedCourse.id) return true
        const courseName = (student.course || '').toLowerCase()
        const code = (selectedCourse.code || '').toLowerCase()
        const name = (selectedCourse.name || '').toLowerCase()
        return courseName.includes(code) || courseName.includes(name) || code.includes(courseName)
      })
    : (overviewData.course_students || [])

  const getBaseRows = () => {
    if (!selectedCategory) return []
    if (selectedCategory === 'groups') {
      if (selectedGroup) {
        return (selectedGroup.members || []).map((m: any, idx: number) => ({
          ...m,
          student_number: idx + 1,
          name: selectedGroup.name,
          course_unit: selectedGroup.course_unit || '—',
          course_unit_name: selectedGroup.course_unit_name || '—',
          coursework: selectedGroup.coursework || '—',
          leader: selectedGroup.leader || '—',
          status: selectedGroup.status || '—',
        }))
      }
      if (selectedCourseUnitId) {
        return filteredGroupsForUnit
      }
      return [...(overviewData.groups || [])].sort((firstGroup: any, secondGroup: any) => compareGroupNames(firstGroup.name, secondGroup.name))
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

  const getActiveRows = () => {
    let rows = getBaseRows()

    // In-modal live search filter
    if (inModalSearch.trim()) {
      const q = inModalSearch.toLowerCase().trim()
      rows = rows.filter((row: any) => {
        return Object.values(row).some((val) => {
          if (val === null || val === undefined) return false
          if (typeof val === 'object') {
            return JSON.stringify(val).toLowerCase().includes(q)
          }
          return String(val).toLowerCase().includes(q)
        })
      })
    }

    // Column Sorting
    if (sortColumn) {
      rows = [...rows].sort((a: any, b: any) => {
        const valA = String(a[sortColumn] ?? '').toLowerCase()
        const valB = String(b[sortColumn] ?? '').toLowerCase()
        const comp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' })
        return sortOrder === 'asc' ? comp : -comp
      })
    }

    return rows
  }

  const getActiveColumns = () => {
    if (!selectedCategory) return []
    let baseCols = getColumnsForCategory(selectedCategory)
    if (selectedCategory === 'groups' && selectedGroup) {
      baseCols = [
        { key: 'student_number', header: 'No.', value: (row) => String(row.student_number || '—') },
        { key: 'student_name', header: 'Student Name', value: (row) => row.student_name || row.full_name || '—' },
        { key: 'registration_number', header: 'Reg No.', value: (row) => row.registration_number || '—' },
        { key: 'email', header: 'Email', value: (row) => row.email || '—' },
        { key: 'whatsapp_phone', header: 'WhatsApp', value: (row) => row.whatsapp_phone || '—' },
        { key: 'course', header: 'Course', value: (row) => row.course || '—' },
        { key: 'gender', header: 'Gender', value: (row) => row.gender || '—' },
        { key: 'name', header: 'Group Name', value: (row) => row.name || selectedGroup.name || '—' },
        { key: 'leader', header: 'Leader', value: (row) => row.leader || selectedGroup.leader || '—' },
        { key: 'coursework', header: 'Coursework', value: (row) => row.coursework || selectedGroup.coursework || '—' },
        { key: 'course_unit', header: 'Course Unit', value: (row) => row.course_unit || selectedGroup.course_unit || '—' },
      ]
    }
    return baseCols.filter((col) => selectedColumnKeys[col.key] !== false)
  }

  const handleSortToggle = (colKey: string) => {
    if (sortColumn === colKey) {
      if (sortOrder === 'asc') setSortOrder('desc')
      else {
        setSortColumn(null)
        setSortOrder('asc')
      }
    } else {
      setSortColumn(colKey)
      setSortOrder('asc')
    }
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

    const escapeHtml = (value: unknown) => String(value ?? '—')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')

    if (selectedCategory === 'groups') {
      const groupsToPrint = selectedGroup
        ? [selectedGroup]
        : selectedCourseUnitId
          ? filteredGroupsForUnit
          : [...(overviewData.groups || [])].sort((firstGroup: any, secondGroup: any) => compareGroupNames(firstGroup.name, secondGroup.name))
      const studentColumnKeys = new Set(['student_name', 'registration_number', 'email', 'whatsapp_phone', 'course', 'gender'])
      const studentColumns = columns.filter((column) => studentColumnKeys.has(column.key))
      const columnsForMembers = studentColumns.length > 0
        ? studentColumns
        : getColumnsForCategory('groups').filter((column) => column.key === 'student_name')
      const groupedUnits = groupsToPrint.reduce((units: Record<string, any[]>, group: any) => {
        const unitKey = `${group.course_unit || '—'} - ${group.course_unit_name || '—'}`
        if (!units[unitKey]) units[unitKey] = []
        units[unitKey].push(group)
        return units
      }, {})

      const groupedHtml = Object.entries(groupedUnits).map(([unitName, unitGroups], unitIndex) => `
        <section class="course-unit ${unitIndex > 0 ? 'page-break' : ''}">
          <h2>Course Unit: ${escapeHtml(unitName)}</h2>
          ${unitGroups.map((group: any) => {
            const members = group.members || []
            const memberRows = members.length > 0
              ? members.slice(0, 500).map((member: any, index: number) => `<tr><td>${index + 1}</td>${columnsForMembers.map((column) => `<td>${escapeHtml(column.value(member))}</td>`).join('')}</tr>`).join('')
              : `<tr><td colspan="${columnsForMembers.length + 1}">No members assigned</td></tr>`
            return `
              <div class="group-section">
                <h3>${escapeHtml(group.name || 'Unnamed Group')}</h3>
                <div class="group-meta">
                  <span><strong>Coursework:</strong> ${escapeHtml(group.coursework)}</span>
                  <span><strong>Leader:</strong> ${escapeHtml(group.leader)}</span>
                  <span><strong>Status:</strong> ${escapeHtml(group.status)}</span>
                  <span><strong>Members:</strong> ${members.length} / ${escapeHtml(group.max_members)}</span>
                </div>
                <table>
                  <thead><tr><th>No.</th>${columnsForMembers.map((column) => `<th>${escapeHtml(column.header)}</th>`).join('')}</tr></thead>
                  <tbody>${memberRows}</tbody>
                </table>
              </div>
            `
          }).join('')}
        </section>
      `).join('')

      printWindow.document.write(`
        <!doctype html>
        <html>
          <head>
            <title>Groups by Course Unit</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
              h1 { margin-bottom: 4px; }
              h2 { border-bottom: 2px solid #111827; padding-bottom: 8px; }
              h3 { margin: 18px 0 6px; }
              .subtitle { color: #6b7280; font-size: 12px; }
              .group-meta { display: flex; flex-wrap: wrap; gap: 16px; font-size: 12px; color: #374151; }
              table { border-collapse: collapse; width: 100%; margin-top: 10px; }
              th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 12px; }
              th { background: #f3f4f6; font-weight: 600; }
              .page-break { page-break-before: always; }
              .group-section { page-break-inside: avoid; }
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body>
            <h1>Groups by Course Unit</h1>
            <p class="subtitle">${groupsToPrint.length} groups · Generated ${escapeHtml(formatDate(new Date().toISOString()))}</p>
            ${groupedHtml || '<p>No groups found for the selected filters.</p>'}
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
      return
    }

    const rowsHtml = rows
      .slice(0, 500)
      .map((row: any) => {
        const cells = columns
          .map((column) => `<td style="border:1px solid #d1d5db; padding:8px; text-align:left;">${escapeHtml(column.value(row))}</td>`)
          .join('')
        return `<tr>${cells}</tr>`
      })
      .join('')

    const headerHtml = columns
      .map((column) => `<th style="border:1px solid #d1d5db; padding:8px; text-align:left; background:#f3f4f6; font-weight:600;">${escapeHtml(column.header)}</th>`)
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
          className={`h-full overflow-hidden border border-border bg-gradient-to-br ${tile.color} p-[1px] transition-transform hover:-translate-y-0.5`}
        >
          <div className="h-full rounded-xl bg-surface p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className={`rounded-lg bg-gradient-to-br ${tile.color} p-3 text-white shadow-sm`}>
                  <Icon className="h-5 w-5" />
                </div>
                {tile.showCount !== false && <Badge variant="secondary" className="font-mono font-bold">{count}</Badge>}
              </div>

              <div className="mt-4 space-y-1">
                <h3 className="text-base font-semibold text-text-primary">{tile.label}</h3>
                <p className="text-xs text-text-secondary">{tile.description}</p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between text-xs text-primary font-semibold">
              <span>View & Custom Export</span>
              <span>→</span>
            </div>
          </div>
        </Card>
      </button>
    )
  }

  // --- LAYOUT VIEWER RENDERERS ---

  // 1. Card Grid View
  const renderCardGridView = (rows: any[], columns: ReportColumn[]) => {
    return (
      <div className="grid gap-4.5 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row: any, index: number) => {
          const titleVal = row.full_name || row.student_name || row.name || row.title || row.code || `Record #${index + 1}`
          const subVal = row.student_registration_number || row.email || row.course_unit || row.faculty || row.course || '—'
          const badgeVal = row.status || row.gender || row.is_active || row.type || null

          return (
            <div
              key={row.id || index}
              className="rounded-2xl border border-border bg-surface p-4.5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                      {String(titleVal).slice(0, 2)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-text-primary line-clamp-1">{titleVal}</h4>
                      <p className="text-xs text-text-muted font-mono">{subVal}</p>
                    </div>
                  </div>
                  {badgeVal && (
                    <Badge variant="secondary" className="text-[10px] capitalize">
                      {badgeVal}
                    </Badge>
                  )}
                </div>

                <div className="space-y-1.5 pt-2 border-t border-border/60 text-xs">
                  {columns.map((col) => (
                    <div key={col.key} className="flex justify-between items-center text-text-secondary">
                      <span className="text-text-muted text-[11px] font-medium">{col.header}:</span>
                      <span className="font-medium text-text-primary text-right max-w-[60%] truncate">
                        {col.value(row)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {row.members && row.members.length > 0 && (
                <div className="pt-2 border-t border-border/60 text-xs text-text-muted">
                  <span className="font-semibold text-text-primary">{row.members.length} Members:</span>{' '}
                  {row.members.map((m: any) => m.student_name || m).slice(0, 3).join(', ')}
                  {row.members.length > 3 && ` +${row.members.length - 3} more`}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // 2. Compact Roster View
  const renderCompactRosterView = (rows: any[], columns: ReportColumn[]) => {
    return (
      <div className="rounded-2xl border border-border bg-surface overflow-hidden divide-y divide-border/60">
        {rows.map((row: any, index: number) => {
          const mainName = row.full_name || row.student_name || row.name || row.title || row.code || `Item #${index + 1}`
          const mainDetail = row.student_registration_number || row.email || row.course_unit || row.leader || '—'

          return (
            <div
              key={row.id || index}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 hover:bg-surface-hover/60 transition-colors gap-2 text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-text-muted w-6 text-center">{index + 1}.</span>
                <div>
                  <div className="font-bold text-text-primary text-sm">{mainName}</div>
                  <div className="text-text-muted font-mono text-[11px]">{mainDetail}</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-text-secondary sm:ml-auto">
                {columns.slice(0, 4).map((col) => (
                  <span key={col.key} className="bg-surface-hover px-2 py-1 rounded-md text-[11px]">
                    <strong className="text-text-muted mr-1">{col.header}:</strong>
                    {col.value(row)}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // 3. Grouped Accordion View
  const renderGroupedAccordionView = (rows: any[], columns: ReportColumn[]) => {
    // Group rows by first secondary field (e.g. course_unit or course or status)
    const groupingKey = selectedCategory === 'groups' ? 'course_unit' : selectedCategory === 'course_unit_students' ? 'course_unit' : 'course'
    const grouped = rows.reduce((acc: Record<string, any[]>, row: any) => {
      const groupName = row[groupingKey] || row.course_unit || row.course || row.status || 'General Roster'
      if (!acc[groupName]) acc[groupName] = []
      acc[groupName].push(row)
      return acc
    }, {})

    return (
      <div className="space-y-3.5">
        {Object.entries(grouped).map(([groupTitle, groupRows]) => {
          const isOpen = expandedAccordions[groupTitle] !== false // open by default

          return (
            <div key={groupTitle} className="rounded-2xl border border-border bg-surface overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => setExpandedAccordions((prev) => ({ ...prev, [groupTitle]: !isOpen }))}
                className="w-full flex items-center justify-between p-4 bg-surface-hover/40 text-left font-bold text-sm text-text-primary hover:bg-surface-hover transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  {isOpen ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-text-muted" />}
                  <span>{groupTitle}</span>
                  <Badge variant="primary" className="ml-2 font-mono text-xs">
                    {groupRows.length} {groupRows.length === 1 ? 'Record' : 'Records'}
                  </Badge>
                </div>
                <span className="text-xs text-text-muted uppercase tracking-wider">{isOpen ? 'Collapse' : 'Expand'}</span>
              </button>

              {isOpen && (
                <div className="p-4 border-t border-border">
                  <DataTable
                    columns={columns.map((col) => ({
                      key: col.key,
                      header: col.header,
                      render: (row: any) => <span className="whitespace-nowrap">{col.value(row)}</span>,
                    }))}
                    data={groupRows}
                    keyExtractor={(row: any) => row.id || row.student_name || row.full_name || row.name || String(Math.random())}
                    emptyMessage="No records in this group"
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Reports & Analytics Overview</h1>
          <p className="text-text-secondary text-sm">Browse, search, dynamically filter, and customize exports across all system rosters.</p>
        </div>

        <div className="inline-flex rounded-xl border border-border bg-surface p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setViewMode('tiles')}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${viewMode === 'tiles' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
          >
            <Grid3X3 className="h-4 w-4" />
            Tiles
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${viewMode === 'list' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
          >
            <List className="h-4 w-4" />
            List
          </button>
        </div>
      </div>

      {!loading && (
        <div className="rounded-xl border border-primary/20 bg-primary/[0.03] px-4 py-3 text-xs text-text-secondary flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <span>Select any list tile below to open interactive controls, live search, 4 layout modes, and custom CSV/PDF exports.</span>
          </div>
        </div>
      )}

      {loading ? (
        <Card>
          <CardContent className="space-y-3 py-8">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-14 animate-pulse rounded-xl bg-secondary/10" />
            ))}
          </CardContent>
        </Card>
      ) : (
        <>
          {viewMode === 'tiles' ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                        <div className="flex items-center gap-3.5">
                          <div className={`rounded-xl bg-gradient-to-br ${tile.color} p-2.5 text-white shadow-sm`}>
                            <tile.icon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-text-primary text-sm">{tile.label}</div>
                            <div className="text-xs text-text-secondary">{tile.description}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-primary">Open Roster →</span>
                          {tile.showCount !== false && <Badge variant="primary" className="font-mono">{count}</Badge>}
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

      {/* Interactive Report Detail Modal */}
      <Modal
        isOpen={Boolean(selectedCategory)}
        onClose={() => {
          setSelectedCategory(null)
          setSelectedCourseUnitId(null)
          setSelectedGroupId(null)
          setSelectedCourseId(null)
          setIsFullScreen(false)
        }}
        title={selectedCategory ? reportTiles.find((tile) => tile.id === selectedCategory)?.label || 'Report Roster' : 'Report Roster'}
        description={selectedCategory ? 'Filter records, switch layout views, customize columns, and preview live exports' : 'Report Details'}
        size={isFullScreen ? 'full' : 'xl'}
      >
        <div className="space-y-5">
          {/* Top Control Bar: Category Filters, Search & Layout Switcher */}
          <div className="space-y-3 bg-surface-hover/30 p-4 rounded-2xl border border-border/80">
            {/* Category Specific Dropdowns */}
            {selectedCategory === 'groups' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Filter by Course Unit</label>
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

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Filter by Group</label>
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
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Filter by Course Unit Roster</label>
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
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Filter by Programme / Course</label>
                <select
                  value={selectedCourseId || ''}
                  onChange={(event) => setSelectedCourseId(event.target.value || null)}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none"
                >
                  <option value="">All Degree Programmes</option>
                  {courseOptions.map((course: any) => (
                    <option key={course.id} value={course.id}>{course.code} - {course.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* In-Modal Search Bar & Layout Controls Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-muted" />
                <input
                  type="text"
                  placeholder="Filter by keyword (name, reg no, email, leader)..."
                  value={inModalSearch}
                  onChange={(e) => setInModalSearch(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface pl-9 pr-3 py-1.5 text-xs text-text-primary focus:border-primary focus:outline-none"
                />
                {inModalSearch && (
                  <button
                    onClick={() => setInModalSearch('')}
                    className="absolute right-2.5 top-2 text-xs text-text-muted hover:text-text-primary"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Layout Switcher Buttons */}
              <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => setModalLayoutMode('table')}
                  className={cn(
                    'p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors',
                    modalLayoutMode === 'table' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
                  )}
                  title="Table View"
                >
                  <Table className="h-3.5 w-3.5" />
                  <span className="hidden md:inline text-[11px]">Table</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalLayoutMode('cards')}
                  className={cn(
                    'p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors',
                    modalLayoutMode === 'cards' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
                  )}
                  title="Card Grid View"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className="hidden md:inline text-[11px]">Cards</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalLayoutMode('roster')}
                  className={cn(
                    'p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors',
                    modalLayoutMode === 'roster' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
                  )}
                  title="Compact Roster View"
                >
                  <ListFilter className="h-3.5 w-3.5" />
                  <span className="hidden md:inline text-[11px]">Compact</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalLayoutMode('accordion')}
                  className={cn(
                    'p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors',
                    modalLayoutMode === 'accordion' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
                  )}
                  title="Grouped Accordion View"
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span className="hidden md:inline text-[11px]">Grouped</span>
                </button>
              </div>

              {/* Full-Screen Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullScreen((prev) => !prev)}
                className="shrink-0 text-xs py-1 px-2.5 h-8"
                title="Toggle Fullscreen"
              >
                {isFullScreen ? <Minimize2 className="h-3.5 w-3.5 mr-1" /> : <Maximize2 className="h-3.5 w-3.5 mr-1" />}
                <span className="hidden sm:inline">{isFullScreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
              </Button>
            </div>
          </div>

          {/* Column Customizer Toolbar */}
          {selectedCategory && (
            <div className="rounded-xl border border-border bg-surface-hover/50 p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-text-muted">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                  <span>Customize Included Columns ({getActiveColumns().length} / {getColumnsForCategory(selectedCategory).length})</span>
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
                    className="text-primary hover:underline text-[11px]"
                  >
                    Select All
                  </button>
                  <span className="text-text-muted">•</span>
                  <button
                    type="button"
                    onClick={() => setSelectedColumnKeys({})}
                    className="text-text-muted hover:underline text-[11px]"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 text-xs">
                {getColumnsForCategory(selectedCategory).map((col) => {
                  const isChecked = selectedColumnKeys[col.key] !== false
                  return (
                    <label
                      key={col.key}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg border px-2 py-0.5 cursor-pointer transition-colors select-none text-[11px]',
                        isChecked ? 'border-primary/40 bg-primary/10 text-primary font-semibold' : 'border-border bg-surface text-text-muted'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => setSelectedColumnKeys((prev) => ({ ...prev, [col.key]: e.target.checked }))}
                        className="h-3 w-3 rounded border-border text-primary"
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
              {inModalSearch && (
                <span className="text-xs text-text-muted">matching search "{inModalSearch}"</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                disabled={getActiveRows().length === 0 || getActiveColumns().length === 0}
              >
                <Download className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportXlsx}
                disabled={getActiveRows().length === 0 || getActiveColumns().length === 0}
              >
                <Download className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
                Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPdf}
                disabled={getActiveRows().length === 0 || getActiveColumns().length === 0}
              >
                <FileText className="h-3.5 w-3.5 mr-1.5 text-rose-600" />
                PDF
              </Button>
            </div>
          </div>

          {/* Active Layout Display */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Active Preview Layout ({modalLayoutMode.toUpperCase()} MODE)
              </h4>
              <span className="text-[11px] text-text-muted">
                Click column headers in Table mode to sort A-Z / Z-A
              </span>
            </div>

            {getActiveRows().length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-surface-hover/30 p-10 text-center text-sm text-text-muted">
                No matching records found for your current filter or search criteria.
              </div>
            ) : getActiveColumns().length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-surface-hover/30 p-10 text-center text-sm text-text-muted">
                Please check at least one column above to display records in the preview.
              </div>
            ) : (
              <>
                {modalLayoutMode === 'table' && (
                  <DataTable
                    columns={getActiveColumns().map((col) => ({
                      key: col.key,
                      header: col.header,
                      sortable: true,
                      render: (row: any) => <span className="whitespace-nowrap">{col.value(row)}</span>,
                    }))}
                    data={getActiveRows()}
                    sorting={{
                      column: sortColumn || '',
                      direction: sortOrder,
                      onSort: handleSortToggle,
                    }}
                    keyExtractor={(row: any) => row.id || row.student_name || row.full_name || row.name || row.title || row.code || String(Math.random())}
                    emptyMessage="No records available"
                  />
                )}

                {modalLayoutMode === 'cards' && renderCardGridView(getActiveRows(), getActiveColumns())}

                {modalLayoutMode === 'roster' && renderCompactRosterView(getActiveRows(), getActiveColumns())}

                {modalLayoutMode === 'accordion' && renderGroupedAccordionView(getActiveRows(), getActiveColumns())}
              </>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}